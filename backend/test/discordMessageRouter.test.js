import test from 'node:test';
import assert from 'node:assert/strict';
import { routeDiscordMessage } from '../src/discord/messageRouter.js';
import { formatDiscordHelpResponse } from '../src/discord/responseFormatter.js';

const botUserId = '1234567890';

test('router keeps bang commands working as before', () => {
  const route = routeDiscordMessage({
    content: '!room Work Room 1',
    botUserId,
  });

  assert.deepEqual(route, {
    type: 'command',
    command: 'room',
    args: ['Work', 'Room', '1'],
  });
});

test('router turns mention-based fan questions into a status command', () => {
  const route = routeDiscordMessage({
    content: `<@${botUserId}> any fan running?`,
    cleanContent: '@OfficeWatch any fan running?',
    botUserId,
  });

  assert.deepEqual(route, {
    type: 'command',
    command: 'status',
    args: [],
  });
});

test('router resolves natural-language room mentions to the room command', () => {
  const route = routeDiscordMessage({
    content: `<@!${botUserId}> status of work room 1?`,
    cleanContent: '@OfficeWatch status of work room 1?',
    botUserId,
  });

  assert.deepEqual(route, {
    type: 'command',
    command: 'room',
    args: ['work1'],
  });
});

test('router resolves mention-based usage questions', () => {
  const route = routeDiscordMessage({
    content: `<@${botUserId}> how much power are we using?`,
    cleanContent: '@OfficeWatch how much power are we using?',
    botUserId,
  });

  assert.deepEqual(route, {
    type: 'command',
    command: 'usage',
    args: [],
  });
});

test('router ignores plain chat that does not mention the bot', () => {
  const route = routeDiscordMessage({
    content: 'any fan running?',
    botUserId,
  });

  assert.deepEqual(route, {
    type: 'ignore',
  });
});

test('router falls back to help for unsupported mention prompts', () => {
  const route = routeDiscordMessage({
    content: `<@${botUserId}> hello there`,
    cleanContent: '@OfficeWatch hello there',
    botUserId,
  });

  assert.deepEqual(route, {
    type: 'help',
  });
  assert.match(formatDiscordHelpResponse(), /I can check the full office/);
});

test('router surfaces unknown-room prompts for a friendly room-specific fallback', () => {
  const route = routeDiscordMessage({
    content: `<@${botUserId}> status of meeting room`,
    cleanContent: '@OfficeWatch status of meeting room',
    botUserId,
  });

  assert.deepEqual(route, {
    type: 'unknown-room',
  });
});

test('router can still resolve a bot mention from cleanContent when the raw content token is unavailable', () => {
  const route = routeDiscordMessage({
    content: '@OfficeWatch any fan running?',
    cleanContent: '@OfficeWatch any fan running?',
    botUserId,
    mentionsBot: true,
  });

  assert.deepEqual(route, {
    type: 'command',
    command: 'status',
    args: [],
  });
});
