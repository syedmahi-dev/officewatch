const roomAliasEntries = [
  ['drawing', 'drawing'],
  ['drawingroom', 'drawing'],
  ['drawing room', 'drawing'],
  ['work1', 'work1'],
  ['work room 1', 'work1'],
  ['workroom1', 'work1'],
  ['1', 'work1'],
  ['work2', 'work2'],
  ['work room 2', 'work2'],
  ['workroom2', 'work2'],
  ['2', 'work2'],
];

export const ROOMS = Object.freeze(['drawing', 'work1', 'work2']);
export const ROOM_DISPLAY_NAMES = Object.freeze({
  drawing: 'Drawing Room',
  work1: 'Work Room 1',
  work2: 'Work Room 2',
});
export const ROOM_ALIASES = new Map(roomAliasEntries);
export const DEVICES_PER_ROOM = Object.freeze({
  fans: 2,
  lights: 3,
});
export const TOTAL_DEVICES = ROOMS.length * (DEVICES_PER_ROOM.fans + DEVICES_PER_ROOM.lights);
export const POWER_DRAW_WATTS = Object.freeze({
  fan: 60,
  light: 15,
});
export const DEVICE_TYPES = Object.freeze(['fan', 'light']);
export const DEVICE_TYPE_COUNTS = Object.freeze({
  fan: DEVICES_PER_ROOM.fans,
  light: DEVICES_PER_ROOM.lights,
});
export const DEVICE_STATUSES = Object.freeze(['on', 'off']);
export const ALERT_TYPES = Object.freeze(['after-hours', 'prolonged-on']);
export const OFFICE_HOURS = Object.freeze({
  startHour: 9,
  endHour: 17,
});
export const PROLONGED_ON_MS = 2 * 60 * 60 * 1000;
export const ALERT_NOTIFICATION_COOLDOWN_MS = 30 * 60 * 1000;
export const RESOLVED_ALERT_RETENTION_MS = 30 * 60 * 1000;
export const DEFAULT_TICK_INTERVAL_MS = 5000;

export function getTickIntervalMs(env = process.env) {
  const raw = Number.parseInt(env.TICK_INTERVAL_MS ?? `${DEFAULT_TICK_INTERVAL_MS}`, 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TICK_INTERVAL_MS;
}

export function isDebugRoutesEnabled(env = process.env) {
  return env.ENABLE_DEBUG_ROUTES === 'true';
}

export function normalizeRoomId(value) {
  const normalized = `${value ?? ''}`.trim().toLowerCase().replace(/\s+/g, ' ');
  return ROOM_ALIASES.get(normalized) ?? ROOM_ALIASES.get(normalized.replace(/\s/g, '')) ?? null;
}

export function getRoomLabel(roomId) {
  return ROOM_DISPLAY_NAMES[roomId] ?? roomId;
}

export function buildDeviceId(room, type, index) {
  return `${room}-${type}-${index}`;
}
