import { ROOM_ALIASES, normalizeRoomId } from '../config/officeLayout.js';

const USAGE_KEYWORDS = ['usage', 'power', 'watt', 'watts', 'kwh', 'consumption', 'bill', 'electric'];
const STATUS_KEYWORDS = [
  'status',
  'running',
  'run',
  'on',
  'off',
  'active',
  'device',
  'devices',
  'fan',
  'fans',
  'light',
  'lights',
];
const HELP_KEYWORDS = ['help', 'command', 'commands', 'what can you do'];
const ROOM_CONTEXT_KEYWORDS = ['room', 'drawing', 'work'];

function normalizeNaturalText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCommandText(text) {
  const [command, ...args] = text.slice(1).trim().split(/\s+/);
  return {
    type: 'command',
    command: command?.toLowerCase() ?? '',
    args,
  };
}

function stripBotMentions(content, botUserId) {
  const mentionPattern = new RegExp(`<@!?${botUserId}>`, 'g');
  return content.replace(mentionPattern, ' ').trim();
}

function findMentionedRoomId(text) {
  const normalized = normalizeNaturalText(text);
  const aliases = [...ROOM_ALIASES.keys()].sort((left, right) => right.length - left.length);

  for (const alias of aliases) {
    if (normalized.includes(alias)) {
      return normalizeRoomId(alias);
    }
  }

  return null;
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function isHelpPrompt(text) {
  return text === 'help' || text === 'commands' || includesAny(text, HELP_KEYWORDS);
}

function looksLikeRoomPrompt(text) {
  return includesAny(text, ROOM_CONTEXT_KEYWORDS);
}

function stripCleanMention(cleanContent) {
  return `${cleanContent ?? ''}`.replace(/^@\S+\s*/, '').trim();
}

export function routeDiscordMessage({ content, cleanContent, botUserId, mentionsBot = false }) {
  const trimmed = `${content ?? ''}`.trim();
  if (!trimmed) {
    return { type: 'ignore' };
  }

  if (trimmed.startsWith('!')) {
    return parseCommandText(trimmed);
  }

  const mentionPattern = new RegExp(`<@!?${botUserId}>`);
  const rawMentionMatched = mentionPattern.test(trimmed);
  if (!rawMentionMatched && !mentionsBot) {
    return { type: 'ignore' };
  }

  const withoutMention = rawMentionMatched
    ? stripBotMentions(trimmed, botUserId)
    : stripCleanMention(cleanContent);
  const normalized = normalizeNaturalText(withoutMention);
  if (!normalized) {
    return { type: 'help' };
  }

  const roomId = findMentionedRoomId(normalized);
  if (roomId) {
    return {
      type: 'command',
      command: 'room',
      args: [roomId],
    };
  }

  if (looksLikeRoomPrompt(normalized)) {
    return { type: 'unknown-room' };
  }

  if (includesAny(normalized, USAGE_KEYWORDS)) {
    return {
      type: 'command',
      command: 'usage',
      args: [],
    };
  }

  if (includesAny(normalized, STATUS_KEYWORDS)) {
    return {
      type: 'command',
      command: 'status',
      args: [],
    };
  }

  if (isHelpPrompt(normalized)) {
    return { type: 'help' };
  }

  return { type: 'help' };
}
