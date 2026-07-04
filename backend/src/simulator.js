export function createSimulator(options) {
  const {
    store,
    alertEngine,
    wsHub,
    discordBot,
    tickIntervalMs,
    now = () => new Date(),
    random = Math.random,
    logger = console,
  } = options;
  let intervalId = null;
  let isTicking = false;
  let paused = false;

  async function publishAlerts(alerts) {
    for (const alert of alerts.newAlerts) {
      wsHub.broadcastAlertNew(alert);
      if (alertEngine.shouldNotify(alert)) {
        await discordBot.notifyAlert(alert);
      }
    }

    for (const alert of alerts.resolvedAlerts) {
      wsHub.broadcastAlertResolved(alert.id);
    }
  }

  async function tick({ manual = false } = {}) {
    if (isTicking || (paused && !manual)) {
      return;
    }

    isTicking = true;
    try {
      const currentTime = now();
      const devices = store.getDevices();
      const roll = random();
      const mutations = roll < 0.35 ? 0 : roll < 0.8 ? 1 : 2;

      if (mutations > 0) {
        const shuffled = [...devices].sort(() => random() - 0.5);
        for (const device of shuffled.slice(0, mutations)) {
          const nextStatus = device.status === 'on' ? 'off' : 'on';
          store.updateDevice(device.id, { status: nextStatus }, { timestamp: currentTime });
        }
      }

      store.recordTick(currentTime);
      const nextDevices = store.getDevices();
      const alerts = alertEngine.evaluate(nextDevices, { currentTime });
      wsHub.broadcastState(nextDevices);
      await publishAlerts(alerts);
    } catch (error) {
      logger.error('Simulator tick failed', error);
    } finally {
      isTicking = false;
    }
  }

    return {
    async start() {
      const currentTime = now();
      store.recordTick(currentTime);
      await publishAlerts(alertEngine.evaluate(store.getDevices(), { currentTime }));
      intervalId = setInterval(() => {
        void tick();
      }, tickIntervalMs);
      intervalId.unref?.();
    },
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
    },
    isPaused() {
      return paused;
    },
    stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
    async tickOnce() {
      await tick({ manual: true });
    },
  };
}
