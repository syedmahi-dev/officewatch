import { formatUsageResponse } from '../responseFormatter.js';

export async function handleUsageCommand(context) {
  await context.message.reply(formatUsageResponse(context.store));
}
