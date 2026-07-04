import { formatStatusResponse } from '../responseFormatter.js';

export async function handleStatusCommand(context) {
  await context.message.reply(formatStatusResponse(context.store));
}
