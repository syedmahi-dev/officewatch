import {
  buildDeviceId,
  DEVICE_STATUSES,
  DEVICE_TYPE_COUNTS,
  DEVICE_TYPES,
  getRoomLabel,
  POWER_DRAW_WATTS,
  ROOMS,
} from './config/officeLayout.js';

function cloneDevice(device) {
  return {
    ...device,
  };
}

function asDate(value) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }

  return date;
}

function dayKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shuffle(items, random) {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}

function deviceSortKey(device) {
  const roomIndex = ROOMS.indexOf(device.room);
  const typeIndex = DEVICE_TYPES.indexOf(device.type);
  const ordinal = Number.parseInt(device.id.split('-').pop(), 10);
  return `${roomIndex}:${typeIndex}:${ordinal}`;
}

function validateDeviceShape(device) {
  if (!device || typeof device !== 'object') {
    throw new Error('Device must be an object');
  }

  if (!ROOMS.includes(device.room)) {
    throw new Error(`Unknown room '${device.room}'`);
  }

  if (!DEVICE_TYPES.includes(device.type)) {
    throw new Error(`Unknown device type '${device.type}'`);
  }

  if (!DEVICE_STATUSES.includes(device.status)) {
    throw new Error(`Unknown device status '${device.status}'`);
  }

  if (!Number.isFinite(device.powerDrawWatts) || device.powerDrawWatts < 0) {
    throw new Error(`Invalid power draw '${device.powerDrawWatts}'`);
  }

  if (!device.id || typeof device.id !== 'string') {
    throw new Error('Device id is required');
  }

  asDate(device.lastChanged);
}

function createCanonicalDevices(nowDate) {
  const devices = [];

  for (const room of ROOMS) {
    for (const type of DEVICE_TYPES) {
      const total = DEVICE_TYPE_COUNTS[type];
      for (let index = 1; index <= total; index += 1) {
        devices.push({
          id: buildDeviceId(room, type, index),
          type,
          room,
          status: 'off',
          powerDrawWatts: 0,
          lastChanged: nowDate.toISOString(),
        });
      }
    }
  }

  return devices.sort((left, right) => deviceSortKey(left).localeCompare(deviceSortKey(right)));
}

function seedDevices(nowDate, random) {
  const devices = createCanonicalDevices(nowDate);
  const minimumOn = Math.floor(devices.length * 0.4);
  const maximumOn = Math.ceil(devices.length * 0.6);
  const desiredOn = minimumOn + Math.floor(random() * (maximumOn - minimumOn + 1));
  const randomizedIds = shuffle(
    devices.map((device) => device.id),
    random,
  );
  const onIds = new Set(randomizedIds.slice(0, desiredOn));

  return devices.map((device) => {
    const isOn = onIds.has(device.id);
    const minutesAgo = 5 + Math.floor(random() * 175);
    const lastChanged = new Date(nowDate.getTime() - minutesAgo * 60 * 1000);
    return {
      ...device,
      status: isOn ? 'on' : 'off',
      powerDrawWatts: isOn ? POWER_DRAW_WATTS[device.type] : 0,
      lastChanged: lastChanged.toISOString(),
    };
  });
}

function buildRoomSummary(room, devices) {
  const roomDevices = devices.filter((device) => device.room === room);
  const totalWatts = roomDevices.reduce((sum, device) => sum + device.powerDrawWatts, 0);
  const activeDevices = roomDevices.filter((device) => device.status === 'on').length;

  return {
    id: room,
    name: getRoomLabel(room),
    devices: roomDevices.map(cloneDevice),
    totalWatts,
    activeDevices,
  };
}

function normalizeDevices(inputDevices) {
  return inputDevices.map((device) => {
    const cloned = cloneDevice(device);
    validateDeviceShape(cloned);
    cloned.lastChanged = asDate(cloned.lastChanged).toISOString();
    return cloned;
  });
}

export function createDeviceStore(options = {}) {
  const nowProvider = options.now ?? (() => new Date());
  const random = options.random ?? Math.random;
  const persistence = options.persistence ?? null;
  const persistedSnapshot = options.initialDevices ? null : persistence?.loadSnapshot?.() ?? null;
  const startupTime = persistedSnapshot?.lastSuccessfulTickAt
    ? asDate(persistedSnapshot.lastSuccessfulTickAt)
    : asDate(nowProvider());
  const seeded = options.initialDevices
    ? normalizeDevices(options.initialDevices)
    : persistedSnapshot?.devices
      ? normalizeDevices(persistedSnapshot.devices)
      : seedDevices(startupTime, random);
  const devices = new Map(seeded.map((device) => [device.id, device]));
  let todayEstimatedWh = Number(persistedSnapshot?.todayEstimatedWh ?? 0);
  if (!Number.isFinite(todayEstimatedWh) || todayEstimatedWh < 0) {
    todayEstimatedWh = 0;
  }

  let currentDay = typeof persistedSnapshot?.currentDay === 'string'
    ? persistedSnapshot.currentDay
    : dayKey(startupTime);
  let lastKwhSampleAt = persistedSnapshot?.lastKwhSampleAt
    ? asDate(persistedSnapshot.lastKwhSampleAt)
    : startupTime;
  let lastSuccessfulTickAt = persistedSnapshot?.lastSuccessfulTickAt
    ? asDate(persistedSnapshot.lastSuccessfulTickAt)
    : startupTime;

  function buildPersistenceSnapshot() {
    return {
      devices: listDevices(),
      todayEstimatedWh,
      currentDay,
      lastKwhSampleAt: lastKwhSampleAt.toISOString(),
      lastSuccessfulTickAt: lastSuccessfulTickAt.toISOString(),
    };
  }

  function persistSnapshot() {
    persistence?.saveSnapshot?.(buildPersistenceSnapshot());
  }

  function replaceDevicesInternal(nextDevices, options = {}) {
    const normalizedDevices = normalizeDevices(nextDevices);

    devices.clear();
    for (const device of normalizedDevices) {
      devices.set(device.id, device);
    }

    const timestamp = asDate(options.timestamp ?? nowProvider());
    lastKwhSampleAt = timestamp;
    lastSuccessfulTickAt = timestamp;
    persistSnapshot();
  }

  function listDevices() {
    return [...devices.values()]
      .sort((left, right) => deviceSortKey(left).localeCompare(deviceSortKey(right)))
      .map(cloneDevice);
  }

  function getRoomSummary(room) {
    return buildRoomSummary(room, listDevices());
  }

  function getUsageSnapshot() {
    const summaries = ROOMS.map((room) => getRoomSummary(room));
    return {
      generatedAt: asDate(nowProvider()).toISOString(),
      totalWattsNow: summaries.reduce((sum, room) => sum + room.totalWatts, 0),
      todayEstimatedKwh: Number((todayEstimatedWh / 1000).toFixed(3)),
      perRoom: Object.fromEntries(
        summaries.map((room) => [
          room.id,
          {
            name: room.name,
            wattsNow: room.totalWatts,
            activeDevices: room.activeDevices,
          },
        ]),
      ),
    };
  }

  function getStatusSnapshot() {
    const devicesList = listDevices();
    const rooms = ROOMS.map((room) => buildRoomSummary(room, devicesList));
    const onDevices = devicesList.filter((device) => device.status === 'on').length;
    const usage = getUsageSnapshot();

    return {
      generatedAt: usage.generatedAt,
      rooms,
      devices: devicesList,
      totals: {
        totalDevices: devicesList.length,
        onDevices,
        offDevices: devicesList.length - onDevices,
        totalWattsNow: usage.totalWattsNow,
        todayEstimatedKwh: usage.todayEstimatedKwh,
      },
    };
  }

  function updateDevice(deviceId, nextState, options = {}) {
    const current = devices.get(deviceId);
    if (!current) {
      throw new Error(`Unknown device '${deviceId}'`);
    }

    const timestamp = asDate(options.timestamp ?? nowProvider());
    const status = nextState.status ?? current.status;
    const powerDrawWatts =
      nextState.powerDrawWatts ?? (status === 'on' ? POWER_DRAW_WATTS[current.type] : 0);
    const updated = {
      ...current,
      ...nextState,
      status,
      powerDrawWatts,
      lastChanged: status !== current.status ? timestamp.toISOString() : current.lastChanged,
    };

    validateDeviceShape(updated);
    devices.set(deviceId, updated);
    persistSnapshot();
    return cloneDevice(updated);
  }

  function recordTick(timestamp = nowProvider()) {
    const currentTime = asDate(timestamp);
    const nextDay = dayKey(currentTime);
    if (nextDay !== currentDay) {
      currentDay = nextDay;
      todayEstimatedWh = 0;
      lastKwhSampleAt = currentTime;
      lastSuccessfulTickAt = currentTime;
      persistSnapshot();
      return;
    }

    const elapsedHours = Math.max(0, currentTime.getTime() - lastKwhSampleAt.getTime()) / 3_600_000;
    const currentTotalWatts = listDevices().reduce((sum, device) => sum + device.powerDrawWatts, 0);
    todayEstimatedWh += currentTotalWatts * elapsedHours;
    lastKwhSampleAt = currentTime;
    lastSuccessfulTickAt = currentTime;
    persistSnapshot();
  }

  persistSnapshot();

  return {
    getDevices: listDevices,
    getDevice(deviceId) {
      const found = devices.get(deviceId);
      return found ? cloneDevice(found) : null;
    },
    getRoom(roomId) {
      return getRoomSummary(roomId);
    },
    getStatusSnapshot,
    getUsageSnapshot,
    updateDevice,
    replaceDevices(nextDevices, options = {}) {
      replaceDevicesInternal(nextDevices, options);
      return listDevices();
    },
    reseed(options = {}) {
      const timestamp = asDate(options.timestamp ?? nowProvider());
      const reseededDevices = seedDevices(timestamp, options.random ?? random);
      replaceDevicesInternal(reseededDevices, { timestamp });
      return listDevices();
    },
    recordTick,
    getLastSuccessfulTickAt() {
      return lastSuccessfulTickAt.toISOString();
    },
    close() {
      persistence?.close?.();
    },
  };
}
