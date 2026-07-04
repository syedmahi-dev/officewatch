import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createOfficeWatchBackend } from '../src/app.js';

async function createRunningBackend(env = {}) {
  const runtime = createOfficeWatchBackend({
    env: {
      PORT: '0',
      ENABLE_DEBUG_ROUTES: 'true',
      SQLITE_PATH: ':memory:',
      ...env,
    },
  });
  const address = await runtime.start(0);
  const port = typeof address === 'object' && address ? address.port : address;
  return {
    runtime,
    baseUrl: `http://127.0.0.1:${port}`,
    wsUrl: `ws://127.0.0.1:${port}/ws`,
  };
}

test('status and room routes return snapshots', async () => {
  const { runtime, baseUrl } = await createRunningBackend();

  try {
    const statusResponse = await fetch(`${baseUrl}/api/status`);
    assert.equal(statusResponse.status, 200);
    const statusBody = await statusResponse.json();
    assert.equal(Array.isArray(statusBody.rooms), true);
    assert.equal(Array.isArray(statusBody.devices), true);

    const roomResponse = await fetch(`${baseUrl}/api/room/Work%20Room%201`);
    assert.equal(roomResponse.status, 200);
    const roomBody = await roomResponse.json();
    assert.equal(roomBody.room.id, 'work1');
  } finally {
    await runtime.stop();
  }
});

test('health route reports simulator status and debug route can force alerts', async () => {
  const { runtime, baseUrl } = await createRunningBackend();

  try {
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthBody = await healthResponse.json();
    assert.equal(healthBody.status, 'ok');
    assert.equal(typeof healthBody.simulatorAlive, 'boolean');

    const debugResponse = await fetch(`${baseUrl}/api/debug/force-alert`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'after-hours',
        room: 'drawing',
      }),
    });
    assert.equal(debugResponse.status, 200);
    const debugBody = await debugResponse.json();
    assert.equal(debugBody.alert.room, 'drawing');
  } finally {
    await runtime.stop();
  }
});

test('demo simulation controller can apply a stable preset', async () => {
  const { runtime, baseUrl } = await createRunningBackend();

  try {
    const simulationResponse = await fetch(`${baseUrl}/api/debug/simulation`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'apply-preset',
        preset: 'mixed-anomaly',
        room: 'work2',
        pause: true,
      }),
    });

    assert.equal(simulationResponse.status, 200);
    const simulationBody = await simulationResponse.json();
    assert.equal(simulationBody.simulatorPaused, true);
    assert.equal(simulationBody.activePreset, 'mixed-anomaly');
    assert.equal(simulationBody.clockOverride !== null, true);
    assert.equal(
      simulationBody.alerts.active.some((alert) => alert.type === 'after-hours' && alert.room === 'work2'),
      true,
    );
    assert.equal(
      simulationBody.alerts.active.some((alert) => alert.type === 'prolonged-on' && alert.room === 'work2'),
      true,
    );
  } finally {
    await runtime.stop();
  }
});

test('websocket sends full-state on connect', async () => {
  const { runtime, wsUrl } = await createRunningBackend();

  try {
    const socket = new WebSocket(wsUrl);
    const [message] = await once(socket, 'message');
    const parsed = JSON.parse(message.toString());

    assert.equal(parsed.type, 'full-state');
    assert.equal(Array.isArray(parsed.payload), true);

    socket.close();
  } finally {
    await runtime.stop();
  }
});
