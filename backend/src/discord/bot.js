import { Client, Events, GatewayIntentBits } from 'discord.js';
import {
  formatAlertNotification,
  formatDiscordHelpResponse,
  formatFriendlyErrorResponse,
  formatUnknownRoomResponse,
} from './responseFormatter.js';
import { handleRoomCommand } from './commands/room.js';
import { handleStatusCommand } from './commands/status.js';
import { handleUsageCommand } from './commands/usage.js';
import { routeDiscordMessage } from './messageRouter.js';

export function createDiscordBot(options) {
  const { env = process.env, store, logger = console } = options;
  const token = env.DISCORD_BOT_TOKEN;
  const alertChannelId = env.DISCORD_ALERT_CHANNEL_ID;
  const recentlyHandledMessageIds = new Map();

  if (!token) {
    return {
      async start() {
        logger.warn('Discord bot disabled: DISCORD_BOT_TOKEN is not set.');
      },
      async stop() {},
      async notifyAlert() {},
    };
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  const handlers = {
    status: handleStatusCommand,
    room: handleRoomCommand,
    usage: handleUsageCommand,
  };

  client.once(Events.ClientReady, () => {
    logger.info(`Discord bot ready as ${client.user?.tag ?? 'unknown bot'}`);
  });

  client.on('error', (error) => {
    logger.error('Discord client error', error);
  });

  client.on('messageCreate', async (message) => {
    if (message.author.bot) {
      return;
    }

    const mentionsBot = Boolean(client.user && message.mentions.users.has(client.user.id));
    const route = routeDiscordMessage({
      content: message.content,
      cleanContent: message.cleanContent,
      botUserId: client.user?.id ?? '',
      mentionsBot,
    });

    if (message.content.startsWith('!') || mentionsBot || route.type !== 'ignore') {
      logger.info('Discord message received', {
        messageId: message.id,
        authorId: message.author.id,
        authorTag: message.author.tag,
        mentionsBot,
        content: message.content,
        cleanContent: message.cleanContent,
        route,
      });
    }

    if (route.type === 'ignore') {
      return;
    }

    const now = Date.now();
    for (const [messageId, handledAt] of recentlyHandledMessageIds.entries()) {
      if (now - handledAt > 5 * 60 * 1000) {
        recentlyHandledMessageIds.delete(messageId);
      }
    }

    if (recentlyHandledMessageIds.has(message.id)) {
      logger.warn('Ignoring duplicate Discord message event', {
        messageId: message.id,
        content: message.content,
      });
      return;
    }
    recentlyHandledMessageIds.set(message.id, now);

    if (route.type === 'help') {
      await message.reply(formatDiscordHelpResponse());
      return;
    }

    if (route.type === 'unknown-room') {
      await message.reply(formatUnknownRoomResponse());
      return;
    }

    const handler = handlers[route.command];
    if (!handler) {
      await message.reply(formatDiscordHelpResponse());
      return;
    }

    try {
      await handler({ message, args: route.args, store });
    } catch (error) {
      logger.error(`Discord command failed: ${route.command}`, error);
      await message.reply(formatFriendlyErrorResponse());
    }
  });

  return {
    async start() {
      await client.login(token);
    },
    async stop() {
      await client.destroy();
    },
    async notifyAlert(alert) {
      if (!alertChannelId) {
        return;
      }

      try {
        const channel = await client.channels.fetch(alertChannelId);
        if (channel?.isTextBased()) {
          await channel.send(formatAlertNotification(alert));
        }
      } catch (error) {
        logger.error('Failed to send Discord alert', error);
      }
    },
  };
}
