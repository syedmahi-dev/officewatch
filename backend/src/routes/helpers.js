import { ALERT_TYPES, normalizeRoomId, ROOMS } from '../config/officeLayout.js';

export function sendError(response, statusCode, message) {
  response.status(statusCode).json({ error: message });
}

export function requireKnownRoom(value) {
  const normalized = normalizeRoomId(value);
  if (!normalized) {
    throw new Error(`Unknown room '${value}'. Valid rooms: ${ROOMS.join(', ')}`);
  }

  return normalized;
}

export function requireKnownAlertType(value) {
  if (!ALERT_TYPES.includes(value)) {
    throw new Error(`Unknown alert type '${value}'. Valid types: ${ALERT_TYPES.join(', ')}`);
  }

  return value;
}
