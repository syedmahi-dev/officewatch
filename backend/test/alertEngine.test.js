import test from 'node:test';
import assert from 'node:assert/strict';
import { createAlertEngine } from '../src/alertEngine.js';

const roomDevices = [
  {
    id: 'work1-fan-1',
    type: 'fan',
    room: 'work1',
    status: 'on',
    powerDrawWatts: 60,
    lastChanged: '2026-07-04T10:30:00',
  },
  {
    id: 'work1-fan-2',
    type: 'fan',
    room: 'work1',
    status: 'on',
    powerDrawWatts: 60,
    lastChanged: '2026-07-04T10:30:00',
  },
  {
    id: 'work1-light-1',
    type: 'light',
    room: 'work1',
    status: 'on',
    powerDrawWatts: 15,
    lastChanged: '2026-07-04T10:30:00',
  },
  {
    id: 'work1-light-2',
    type: 'light',
    room: 'work1',
    status: 'on',
    powerDrawWatts: 15,
    lastChanged: '2026-07-04T10:30:00',
  },
  {
    id: 'work1-light-3',
    type: 'light',
    room: 'work1',
    status: 'on',
    powerDrawWatts: 15,
    lastChanged: '2026-07-04T10:30:00',
  },
];

test('alert engine triggers prolonged-on after 2 hours of every device being on', () => {
  const alertEngine = createAlertEngine({
    now: () => new Date('2026-07-04T12:31:00'),
  });

  const result = alertEngine.evaluate(roomDevices, {
    currentTime: new Date('2026-07-04T12:31:00'),
  });

  assert.equal(result.newAlerts.some((alert) => alert.type === 'prolonged-on'), true);
  assert.equal(result.newAlerts.some((alert) => alert.type === 'after-hours'), false);
});

test('alert engine resolves after-hours once devices turn off', () => {
  const alertEngine = createAlertEngine({
    now: () => new Date('2026-07-04T18:00:00'),
  });

  const active = alertEngine.evaluate(roomDevices, {
    currentTime: new Date('2026-07-04T18:00:00'),
  });
  assert.equal(active.active.length >= 1, true);

  const resolved = alertEngine.evaluate(
    roomDevices.map((device) => ({
      ...device,
      status: 'off',
      powerDrawWatts: 0,
    })),
    {
      currentTime: new Date('2026-07-04T18:05:00'),
    },
  );

  assert.equal(resolved.resolvedAlerts.some((alert) => alert.type === 'after-hours'), true);
});
