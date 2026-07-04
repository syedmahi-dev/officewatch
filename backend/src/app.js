import http from 'node:http';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createAlertEngine } from './alertEngine.js';
import { createDeviceStore } from './deviceStore.js';
import { createDiscordBot } from './discord/bot.js';
import { createOpenApiSpec } from './docs/openapi.js';
import { createDemoController } from './demo/demoController.js';
import { registerAlertsRoute } from './routes/alerts.js';
import { registerDebugRoute } from './routes/debug.js';
import { registerDocsRoutes } from './routes/docs.js';
import { registerHealthRoute } from './routes/health.js';
import { registerRoomRoute } from './routes/room.js';
import { registerSimulationRoute } from './routes/simulation.js';
import { registerStatusRoute } from './routes/status.js';
import { registerUsageRoute } from './routes/usage.js';
import { createSimulationClock } from './simulationClock.js';
import { createSimulator } from './simulator.js';
import { getTickIntervalMs } from './config/officeLayout.js';
import { createSqlitePersistence } from './sqlitePersistence.js';
import { createWebSocketHub } from './ws/hub.js';

dotenv.config({ quiet: true });

const DEFAULT_SQLITE_PATH = fileURLToPath(new URL('../data/officewatch.sqlite', import.meta.url));

function getSqlitePath(env) {
  const configuredPath = `${env.SQLITE_PATH ?? ''}`.trim();
  return configuredPath || DEFAULT_SQLITE_PATH;
}

export function createOfficeWatchBackend(options = {}) {
  const env = options.env ?? process.env;
  const clock = createSimulationClock({
    now: options.now,
  });
  const now = () => clock.now();
  const random = options.random ?? Math.random;
  const logger = options.logger ?? console;
  const startedAt = Date.now();
  const tickIntervalMs = getTickIntervalMs(env);
  const persistence = options.persistence ?? createSqlitePersistence({
    databasePath: getSqlitePath(env),
  });
  const store = createDeviceStore({
    now,
    random,
    initialDevices: options.initialDevices,
    persistence,
  });
  const alertEngine = createAlertEngine({ now });
  const app = express();
  const httpServer = http.createServer(app);
  const wsHub = createWebSocketHub({
    server: httpServer,
    getFullState: () => store.getDevices(),
    logger,
  });
  const discordBot = createDiscordBot({ env, store, logger });
  const simulator = createSimulator({
    store,
    alertEngine,
    wsHub,
    discordBot,
    tickIntervalMs,
    now,
    random,
    logger,
  });
  const demoController = createDemoController({
    store,
    simulator,
    alertEngine,
    wsHub,
    discordBot,
    clock,
    random,
  });
  const openApiSpec = createOpenApiSpec();

  app.use(cors());
  app.use(express.json());

  registerStatusRoute(app, store);
  registerRoomRoute(app, store);
  registerUsageRoute(app, store);
  registerAlertsRoute(app, alertEngine);
  registerHealthRoute(app, () => {
    const lastSuccessfulTickAt = new Date(store.getLastSuccessfulTickAt());
    const simulatorAlive = Date.now() - lastSuccessfulTickAt.getTime() < tickIntervalMs * 2;
    return {
      status: 'ok',
      uptimeSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(2)),
      simulatorAlive,
      tickIntervalMs,
      lastSuccessfulTickAt: lastSuccessfulTickAt.toISOString(),
      wsClients: wsHub.getClientCount(),
    };
  });
  registerDebugRoute(app, { env, alertEngine, wsHub, discordBot });
  registerSimulationRoute(app, { env, demoController });
  registerDocsRoutes(app, openApiSpec);

  app.use((error, _request, response, _next) => {
    logger.error('Unhandled request error', error);
    response.status(500).json({ error: 'Internal server error' });
  });

  async function start(
    port = Number.parseInt(env.PORT ?? '3000', 10),
    host = env.HOST ?? '127.0.0.1',
  ) {
    await discordBot.start();
    await simulator.start();
    await new Promise((resolve, reject) => {
      httpServer.once('error', reject);
      httpServer.listen(port, host, () => {
        httpServer.off('error', reject);
        resolve();
      });
    });
    return httpServer.address();
  }

  async function stop() {
    simulator.stop();
    wsHub.close();
    await discordBot.stop();
    try {
      await new Promise((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    } finally {
      store.close();
    }
  }

  return {
    app,
    httpServer,
    store,
    alertEngine,
    simulator,
    demoController,
    wsHub,
    start,
    stop,
    openApiSpec,
  };
}
