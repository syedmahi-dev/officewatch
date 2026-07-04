import { formatRoomResponse, formatUnknownRoomResponse } from '../responseFormatter.js';
import { normalizeRoomId, ROOMS } from '../../config/officeLayout.js';

export async function handleRoomCommand(context) {
  const joined = context.args.join(' ').trim();
  const roomId = normalizeRoomId(joined);
  if (!roomId) {
    await context.message.reply(
      joined ? formatUnknownRoomResponse() : `Tell me which room to check: ${ROOMS.join(', ')}.`,
    );
    return;
  }

  await context.message.reply(formatRoomResponse(context.store.getRoom(roomId)));
}
