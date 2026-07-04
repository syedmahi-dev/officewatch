import { PROLONGED_ON_MS, ROOMS } from '../config/officeLayout.js';

export const DEMO_PRESETS = Object.freeze([
  'baseline',
  'all-off',
  'after-hours-alert',
  'prolonged-on-alert',
  'mixed-anomaly',
]);

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

function atLocalHour(date, hour) {
  const output = new Date(date.getTime());
  output.setHours(hour, 0, 0, 0);
  return output;
}

function cloneDevices(devices) {
  return devices.map((device) => ({ ...device }));
}

function setAllDevicesOff(devices, timestamp) {
  return devices.map((device) => ({
    ...device,
    status: 'off',
    powerDrawWatts: 0,
    lastChanged: timestamp.toISOString(),
  }));
}

function markRoomDevicesOn(devices, roomId, timestamp) {
  return devices.map((device) => {
    if (device.room !== roomId) {
      return device;
    }

    return {
      ...device,
      status: 'on',
      powerDrawWatts: device.type === 'fan' ? 60 : 15,
      lastChanged: timestamp.toISOString(),
    };
  });
}

function buildPresetState(preset, roomId, devices, currentTime) {
  const baseDevices = setAllDevicesOff(cloneDevices(devices), currentTime);

  switch (preset) {
    case 'all-off':
      return {
        overrideTime: null,
        devices: baseDevices,
      };
    case 'after-hours-alert': {
      const overrideTime = atLocalHour(currentTime, 22);
      return {
        overrideTime,
        devices: markRoomDevicesOn(baseDevices, roomId, new Date(overrideTime.getTime() - 5 * 60 * 1000)),
      };
    }
    case 'prolonged-on-alert': {
      const overrideTime = atLocalHour(currentTime, 13);
      return {
        overrideTime,
        devices: markRoomDevicesOn(
          baseDevices,
          roomId,
          new Date(overrideTime.getTime() - PROLONGED_ON_MS - 10 * 60 * 1000),
        ),
      };
    }
    case 'mixed-anomaly': {
      const overrideTime = atLocalHour(currentTime, 22);
      return {
        overrideTime,
        devices: markRoomDevicesOn(
          baseDevices,
          roomId,
          new Date(overrideTime.getTime() - PROLONGED_ON_MS - 10 * 60 * 1000),
        ),
      };
    }
    default:
      throw new Error(`Unknown demo preset '${preset}'`);
  }
}

export function createDemoController(options) {
  const {
    store,
    simulator,
    alertEngine,
    wsHub,
    discordBot,
    clock,
    random = Math.random,
  } = options;
  let activePreset = 'baseline';

  async function publishAlertTransitions(alerts) {
    for (const alert of alerts.newAlerts) {
      wsHub.broadcastAlertNew(alert);
      if (alertEngine.shouldNotify(alert)) {
        await discordBot.notifyAlert(alert);
      }
    }

    for (const alert of alerts.resolvedAlerts) {
      wsHub.broadcastAlertResolved(alert.id);
    }
  }

  async function syncState(currentTime) {
    store.recordTick(currentTime);
    const devices = store.getDevices();
    const alerts = alertEngine.evaluate(devices, { currentTime });
    wsHub.broadcastState(devices);
    await publishAlertTransitions(alerts);
    return alerts;
  }

  function getSnapshot() {
    return {
      simulatorPaused: simulator.isPaused(),
      activePreset,
      clockOverride: clock.getOverride(),
      availablePresets: DEMO_PRESETS,
      alerts: alertEngine.getSnapshot(),
      totals: store.getStatusSnapshot().totals,
    };
  }

  return {
    getSnapshot,
    async pause() {
      simulator.pause();
      return getSnapshot();
    },
    async resume() {
      simulator.resume();
      activePreset = 'baseline';
      return getSnapshot();
    },
    async tickOnce() {
      await simulator.tickOnce();
      return getSnapshot();
    },
    async setClockOverride(value) {
      const overrideTime = clock.setOverride(value);
      await syncState(overrideTime);
      return getSnapshot();
    },
    async clearClockOverride() {
      clock.clearOverride();
      const currentTime = clock.now();
      await syncState(currentTime);
      return getSnapshot();
    },
    async resetBaseline() {
      const currentTime = clock.now();
      clock.clearOverride();
      store.reseed({ timestamp: currentTime, random });
      simulator.resume();
      activePreset = 'baseline';
      await syncState(currentTime);
      return getSnapshot();
    },
    async applyPreset(preset, options = {}) {
      if (!DEMO_PRESETS.includes(preset)) {
        throw new Error(`Unknown demo preset '${preset}'. Available presets: ${DEMO_PRESETS.join(', ')}`);
      }

      if (preset === 'baseline') {
        return this.resetBaseline();
      }

      const roomId = options.room ?? 'work2';
      if (!ROOMS.includes(roomId)) {
        throw new Error(`Unknown room '${roomId}'. Valid rooms: ${ROOMS.join(', ')}`);
      }

      const currentTime = asDate(options.currentTime ?? clock.now());
      const presetState = buildPresetState(preset, roomId, store.getDevices(), currentTime);
      if (presetState.overrideTime) {
        clock.setOverride(presetState.overrideTime);
      } else {
        clock.clearOverride();
      }

      store.replaceDevices(presetState.devices);

      if (options.pause !== false) {
        simulator.pause();
      }

      activePreset = preset;
      await syncState(clock.now());
      return getSnapshot();
    },
  };
}
