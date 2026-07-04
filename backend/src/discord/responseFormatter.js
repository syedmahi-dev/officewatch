import { getRoomLabel, ROOMS } from '../config/officeLayout.js';

function formatCount(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function humanJoin(items) {
  if (items.length === 0) {
    return '';
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function summarizeActiveDevices(room) {
  const active = room.devices.filter((device) => device.status === 'on');
  const fansOn = active.filter((device) => device.type === 'fan').length;
  const lightsOn = active.filter((device) => device.type === 'light').length;
  const countParts = [];

  if (fansOn > 0) {
    countParts.push(formatCount(fansOn, 'fan'));
  }

  if (lightsOn > 0) {
    countParts.push(formatCount(lightsOn, 'light'));
  }

  return {
    active,
    fansOn,
    lightsOn,
    countSummary: humanJoin(countParts),
    activeLabels: active.map((device) => device.id.split('-').slice(1).join(' ')),
  };
}

function describeRoom(room, options = {}) {
  const { focused = false } = options;
  const summary = summarizeActiveDevices(room);

  if (summary.active.length === 0) {
    return focused
      ? `${room.name} is fully off right now, so it's drawing 0W.`
      : `${room.name} is fully off right now.`;
  }

  const activeLabels = humanJoin(summary.activeLabels);
  const detail = `${summary.countSummary} on`;
  const wattage = `${room.totalWatts}W`;

  if (summary.active.length === room.devices.length) {
    return focused
      ? `${room.name} is fully on right now with all ${room.devices.length} devices active (${activeLabels}). That's ${wattage} at the moment.`
      : `${room.name} is fully on right now with ${detail}. It's drawing ${wattage}.`;
  }

  return focused
    ? `${room.name} currently has ${detail} (${activeLabels}). That's ${wattage} right now.`
    : `${room.name} currently has ${detail} and is drawing ${wattage}.`;
}

export function formatStatusResponse(store) {
  const snapshot = store.getStatusSnapshot();
  if (snapshot.devices.length === 0) {
    return 'Still warming up, try again in a few seconds.';
  }

  const lines = ['Here is the latest office check:'];
  lines.push(...snapshot.rooms.map((room) => describeRoom(room)));
  lines.push(
    `Across the office, ${formatCount(snapshot.totals.onDevices, 'device')} are on and the total draw is ${snapshot.totals.totalWattsNow}W. Today's estimated usage is ${snapshot.totals.todayEstimatedKwh} kWh.`,
  );
  return lines.join('\n');
}

export function formatRoomResponse(room) {
  return describeRoom(room, { focused: true });
}

export function formatUsageResponse(store) {
  const usage = store.getUsageSnapshot();
  const roomBreakdown = ROOMS.map((roomId) => {
    const room = usage.perRoom[roomId];
    return `${getRoomLabel(roomId)} ${room.wattsNow}W (${formatCount(room.activeDevices, 'device')} on)`;
  }).join(' | ');

  return `Right now the office is drawing ${usage.totalWattsNow}W. Today's estimated usage is ${usage.todayEstimatedKwh} kWh. Room by room: ${roomBreakdown}.`;
}

export function formatAlertNotification(alert) {
  return `Heads up: ${alert.message}`;
}

export function formatDiscordHelpResponse() {
  return `I can check the full office, a single room, or current power usage. Try !status, !room ${ROOMS[1]}, !usage, or ask me "@OfficeWatch status of work room 1".`;
}

export function formatUnknownRoomResponse() {
  return `I couldn't match that room yet. Try drawing, work1, or work2. For example: !room work1 or "@OfficeWatch status of work room 1".`;
}

export function formatFriendlyErrorResponse() {
  return 'Sorry, something went wrong while I was checking that. Please try again in a moment.';
}
