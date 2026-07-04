import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const MEMORY_PATH = ':memory:';

function normalizeDatabasePath(databasePath) {
  if (!databasePath) {
    return null;
  }

  return databasePath === MEMORY_PATH ? MEMORY_PATH : resolve(databasePath);
}

function withTransaction(database, operation) {
  database.exec('BEGIN IMMEDIATE');

  try {
    const result = operation();
    database.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      database.exec('ROLLBACK');
    } catch {
      // Surface the original failure if rollback also fails.
    }

    throw error;
  }
}

export function createSqlitePersistence(options = {}) {
  const databasePath = normalizeDatabasePath(options.databasePath);
  if (!databasePath) {
    return null;
  }

  if (databasePath !== MEMORY_PATH) {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      room TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      power_draw_watts REAL NOT NULL,
      last_changed TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS store_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const clearDevices = database.prepare('DELETE FROM devices');
  const selectDevices = database.prepare(`
    SELECT id, room, type, status, power_draw_watts, last_changed
    FROM devices
  `);
  const upsertDevice = database.prepare(`
    INSERT INTO devices (id, room, type, status, power_draw_watts, last_changed)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      room = excluded.room,
      type = excluded.type,
      status = excluded.status,
      power_draw_watts = excluded.power_draw_watts,
      last_changed = excluded.last_changed
  `);
  const selectState = database.prepare('SELECT value FROM store_state WHERE key = ?');
  const upsertState = database.prepare(`
    INSERT INTO store_state (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  function readState(key) {
    const row = selectState.get(key);
    return row ? JSON.parse(row.value) : null;
  }

  function writeState(key, value) {
    upsertState.run(key, JSON.stringify(value));
  }

  return {
    databasePath,
    loadSnapshot() {
      const devices = selectDevices.all().map((row) => ({
        id: row.id,
        room: row.room,
        type: row.type,
        status: row.status,
        powerDrawWatts: row.power_draw_watts,
        lastChanged: row.last_changed,
      }));

      if (devices.length === 0) {
        return null;
      }

      return {
        devices,
        todayEstimatedWh: Number(readState('todayEstimatedWh') ?? 0),
        currentDay: readState('currentDay'),
        lastKwhSampleAt: readState('lastKwhSampleAt'),
        lastSuccessfulTickAt: readState('lastSuccessfulTickAt'),
      };
    },
    saveSnapshot(snapshot) {
      withTransaction(database, () => {
        clearDevices.run();

        for (const device of snapshot.devices) {
          upsertDevice.run(
            device.id,
            device.room,
            device.type,
            device.status,
            device.powerDrawWatts,
            device.lastChanged,
          );
        }

        writeState('todayEstimatedWh', snapshot.todayEstimatedWh);
        writeState('currentDay', snapshot.currentDay);
        writeState('lastKwhSampleAt', snapshot.lastKwhSampleAt);
        writeState('lastSuccessfulTickAt', snapshot.lastSuccessfulTickAt);
      });
    },
    close() {
      database.close();
    },
  };
}
