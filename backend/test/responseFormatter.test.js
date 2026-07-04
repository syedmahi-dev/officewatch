import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatAlertNotification,
  formatDiscordHelpResponse,
  formatRoomResponse,
  formatStatusResponse,
  formatUnknownRoomResponse,
  formatUsageResponse,
} from '../src/discord/responseFormatter.js';

function createMockStore() {
  const roomSnapshots = {
    drawing: {
      id: 'drawing',
      name: 'Drawing Room',
      totalWatts: 75,
      activeDevices: 2,
      devices: [
        { id: 'drawing-fan-1', type: 'fan', status: 'on' },
        { id: 'drawing-fan-2', type: 'fan', status: 'off' },
        { id: 'drawing-light-1', type: 'light', status: 'on' },
        { id: 'drawing-light-2', type: 'light', status: 'off' },
        { id: 'drawing-light-3', type: 'light', status: 'off' },
      ],
    },
    work1: {
      id: 'work1',
      name: 'Work Room 1',
      totalWatts: 0,
      activeDevices: 0,
      devices: [
        { id: 'work1-fan-1', type: 'fan', status: 'off' },
        { id: 'work1-fan-2', type: 'fan', status: 'off' },
        { id: 'work1-light-1', type: 'light', status: 'off' },
        { id: 'work1-light-2', type: 'light', status: 'off' },
        { id: 'work1-light-3', type: 'light', status: 'off' },
      ],
    },
    work2: {
      id: 'work2',
      name: 'Work Room 2',
      totalWatts: 150,
      activeDevices: 4,
      devices: [
        { id: 'work2-fan-1', type: 'fan', status: 'on' },
        { id: 'work2-fan-2', type: 'fan', status: 'on' },
        { id: 'work2-light-1', type: 'light', status: 'on' },
        { id: 'work2-light-2', type: 'light', status: 'on' },
        { id: 'work2-light-3', type: 'light', status: 'off' },
      ],
    },
  };

  return {
    getStatusSnapshot() {
      return {
        devices: new Array(15).fill({}),
        rooms: [roomSnapshots.drawing, roomSnapshots.work1, roomSnapshots.work2],
        totals: {
          onDevices: 6,
          totalWattsNow: 225,
          todayEstimatedKwh: 1.375,
        },
      };
    },
    getRoom(roomId) {
      return roomSnapshots[roomId];
    },
    getUsageSnapshot() {
      return {
        totalWattsNow: 225,
        todayEstimatedKwh: 1.375,
        perRoom: {
          drawing: { wattsNow: 75, activeDevices: 2 },
          work1: { wattsNow: 0, activeDevices: 0 },
          work2: { wattsNow: 150, activeDevices: 4 },
        },
      };
    },
  };
}

test('status formatter produces a humanized office summary', () => {
  const output = formatStatusResponse(createMockStore());

  assert.match(output, /Here is the latest office check:/);
  assert.match(output, /Drawing Room currently has 1 fan and 1 light on and is drawing 75W\./);
  assert.match(output, /Work Room 1 is fully off right now\./);
  assert.match(output, /Across the office, 6 devices are on and the total draw is 225W\./);
});

test('room formatter focuses on the requested room only', () => {
  const output = formatRoomResponse(createMockStore().getRoom('work2'));

  assert.match(output, /Work Room 2 currently has 2 fans and 2 lights on/);
  assert.match(output, /fan 1, fan 2, light 1, and light 2/);
  assert.match(output, /150W right now/);
});

test('usage formatter summarizes current and per-room usage', () => {
  const output = formatUsageResponse(createMockStore());

  assert.match(output, /Right now the office is drawing 225W\./);
  assert.match(output, /Today's estimated usage is 1.375 kWh\./);
  assert.match(output, /Drawing Room 75W \(2 devices on\)/);
  assert.match(output, /Work Room 1 0W \(0 devices on\)/);
});

test('help, unknown-room, and alert formatters stay friendly', () => {
  assert.match(formatDiscordHelpResponse(), /I can check the full office/);
  assert.match(formatUnknownRoomResponse(), /Try drawing, work1, or work2/);
  assert.equal(
    formatAlertNotification({ message: 'Work Room 2 still has lights on.' }),
    'Heads up: Work Room 2 still has lights on.',
  );
});
