import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDeviceStore } from '../src/deviceStore.js';
import { createSqlitePersistence } from '../src/sqlitePersistence.js';

test('device store updates known devices and stamps lastChanged on status flips', () => {
  const store = createDeviceStore({
    now: () => new Date('2026-07-04T10:00:00.000Z'),
    initialDevices: [
      {
        id: 'drawing-fan-1',
        type: 'fan',
        room: 'drawing',
        status: 'off',
        powerDrawWatts: 0,
        lastChanged: '2026-07-04T09:00:00.000Z',
      },
    ],
  });

  const updated = store.updateDevice(
    'drawing-fan-1',
    { status: 'on' },
    { timestamp: new Date('2026-07-04T10:15:00.000Z') },
  );

  assert.equal(updated.status, 'on');
  assert.equal(updated.powerDrawWatts, 60);
  assert.equal(updated.lastChanged, '2026-07-04T10:15:00.000Z');
});

test('device store rejects unknown devices', () => {
  const store = createDeviceStore({
    now: () => new Date('2026-07-04T10:00:00.000Z'),
    initialDevices: [
      {
        id: 'drawing-fan-1',
        type: 'fan',
        room: 'drawing',
        status: 'off',
        powerDrawWatts: 0,
        lastChanged: '2026-07-04T09:00:00.000Z',
      },
    ],
  });

  assert.throws(() => {
    store.updateDevice('missing-device', { status: 'on' });
  }, /Unknown device/);
});

test('device store reloads devices and usage from sqlite persistence', () => {
  const directory = mkdtempSync(join(tmpdir(), 'officewatch-store-'));
  const databasePath = join(directory, 'device-store.sqlite');

  try {
    const store = createDeviceStore({
      now: () => new Date('2026-07-04T10:00:00.000Z'),
      initialDevices: [
        {
          id: 'drawing-fan-1',
          type: 'fan',
          room: 'drawing',
          status: 'on',
          powerDrawWatts: 60,
          lastChanged: '2026-07-04T09:00:00.000Z',
        },
      ],
      persistence: createSqlitePersistence({ databasePath }),
    });

    store.recordTick(new Date('2026-07-04T11:00:00.000Z'));
    store.close();

    const reloadedStore = createDeviceStore({
      now: () => new Date('2026-07-04T11:05:00.000Z'),
      persistence: createSqlitePersistence({ databasePath }),
    });

    assert.equal(reloadedStore.getDevice('drawing-fan-1')?.status, 'on');
    assert.equal(reloadedStore.getUsageSnapshot().todayEstimatedKwh, 0.06);
    assert.equal(reloadedStore.getLastSuccessfulTickAt(), '2026-07-04T11:00:00.000Z');

    reloadedStore.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
