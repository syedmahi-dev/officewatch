import {
  ALERT_NOTIFICATION_COOLDOWN_MS,
  ALERT_TYPES,
  getRoomLabel,
  OFFICE_HOURS,
  POWER_DRAW_WATTS,
  PROLONGED_ON_MS,
  RESOLVED_ALERT_RETENTION_MS,
  ROOMS,
} from './config/officeLayout.js';

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

function isOfficeHours(date) {
  const hour = date.getHours();
  return hour >= OFFICE_HOURS.startHour && hour < OFFICE_HOURS.endHour;
}

function summarizeDevices(devices) {
  const fans = devices.filter((device) => device.type === 'fan').length;
  const lights = devices.filter((device) => device.type === 'light').length;
  return { fans, lights };
}

function buildAlertMessage(type, room, devices) {
  const roomLabel = getRoomLabel(room);
  const { fans, lights } = summarizeDevices(devices);

  if (type === 'after-hours') {
    return `${roomLabel}: ${fans} fan${fans === 1 ? '' : 's'} and ${lights} light${
      lights === 1 ? '' : 's'
    } still on after office hours.`;
  }

  return `${roomLabel}: all ${devices.length} devices have been on continuously for 2+ hours.`;
}

function createAlert(type, room, devices, timestamp, forced = false) {
  return {
    id: `${type}:${room}`,
    type,
    room,
    message: forced
      ? `${getRoomLabel(room)}: ${type} alert triggered manually for demo verification.`
      : buildAlertMessage(type, room, devices),
    triggeredAt: timestamp.toISOString(),
    resolvedAt: null,
  };
}

function sortAlerts(alerts) {
  return [...alerts].sort(
    (left, right) => new Date(right.triggeredAt).getTime() - new Date(left.triggeredAt).getTime(),
  );
}

export function createAlertEngine(options = {}) {
  const nowProvider = options.now ?? (() => new Date());
  const activeAlerts = new Map();
  const resolvedAlerts = new Map();
  const lastNotifiedAt = new Map();

  function buildCandidates(devices, currentTime) {
    const grouped = new Map(ROOMS.map((room) => [room, devices.filter((device) => device.room === room)]));
    const candidates = new Map();

    if (!isOfficeHours(currentTime)) {
      for (const [room, roomDevices] of grouped.entries()) {
        const activeDevices = roomDevices.filter((device) => device.status === 'on');
        if (activeDevices.length > 0) {
          candidates.set(`after-hours:${room}`, createAlert('after-hours', room, activeDevices, currentTime));
        }
      }
    }

    for (const [room, roomDevices] of grouped.entries()) {
      if (roomDevices.length === 0) {
        continue;
      }

      const everyDeviceOn = roomDevices.every((device) => device.status === 'on');
      const everyDeviceLongRunning = roomDevices.every((device) => {
        const lastChanged = asDate(device.lastChanged);
        return currentTime.getTime() - lastChanged.getTime() >= PROLONGED_ON_MS;
      });

      if (everyDeviceOn && everyDeviceLongRunning) {
        candidates.set(
          `prolonged-on:${room}`,
          createAlert('prolonged-on', room, roomDevices, currentTime),
        );
      }
    }

    return candidates;
  }

  function pruneResolved(currentTime) {
    for (const [key, alert] of resolvedAlerts.entries()) {
      if (currentTime.getTime() - new Date(alert.resolvedAt).getTime() > RESOLVED_ALERT_RETENTION_MS) {
        resolvedAlerts.delete(key);
      }
    }
  }

  function evaluate(devices, options = {}) {
    const currentTime = asDate(options.currentTime ?? nowProvider());
    const candidates = buildCandidates(devices, currentTime);
    const newAlerts = [];
    const resolved = [];

    for (const [key, candidate] of candidates.entries()) {
      const existing = activeAlerts.get(key);
      if (existing) {
        activeAlerts.set(key, {
          ...existing,
          message: candidate.message,
        });
        continue;
      }

      activeAlerts.set(key, candidate);
      newAlerts.push(candidate);
    }

    for (const [key, existing] of [...activeAlerts.entries()]) {
      if (candidates.has(key)) {
        continue;
      }

      const resolvedAlert = {
        ...existing,
        resolvedAt: currentTime.toISOString(),
      };
      activeAlerts.delete(key);
      resolvedAlerts.set(key, resolvedAlert);
      resolved.push(resolvedAlert);
    }

    pruneResolved(currentTime);

    return {
      active: sortAlerts(activeAlerts.values()),
      recentResolved: sortAlerts(resolvedAlerts.values()),
      newAlerts: sortAlerts(newAlerts),
      resolvedAlerts: sortAlerts(resolved),
    };
  }

  function forceAlert(type, room, options = {}) {
    if (!ALERT_TYPES.includes(type)) {
      throw new Error(`Unsupported alert type '${type}'`);
    }

    const currentTime = asDate(options.currentTime ?? nowProvider());
    const key = `${type}:${room}`;
    const existing = activeAlerts.get(key);
    if (existing) {
      return {
        alert: existing,
        created: false,
      };
    }

    const placeholderDevices =
      type === 'after-hours'
        ? [{ type: 'fan', powerDrawWatts: POWER_DRAW_WATTS.fan }, { type: 'light', powerDrawWatts: POWER_DRAW_WATTS.light }]
        : new Array(5).fill(null).map(() => ({ type: 'fan', powerDrawWatts: POWER_DRAW_WATTS.fan }));
    const alert = createAlert(type, room, placeholderDevices, currentTime, true);
    activeAlerts.set(key, alert);

    return {
      alert,
      created: true,
    };
  }

  return {
    evaluate,
    forceAlert,
    getSnapshot() {
      return {
        active: sortAlerts(activeAlerts.values()),
        recentResolved: sortAlerts(resolvedAlerts.values()),
      };
    },
    shouldNotify(alert, options = {}) {
      const currentTime = asDate(options.currentTime ?? nowProvider());
      const lastSentAt = lastNotifiedAt.get(alert.id);
      if (lastSentAt && currentTime.getTime() - lastSentAt < ALERT_NOTIFICATION_COOLDOWN_MS) {
        return false;
      }

      lastNotifiedAt.set(alert.id, currentTime.getTime());
      return true;
    },
  };
}
