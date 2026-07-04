import { createOfficeWatchBackend } from './app.js';

const runtime = createOfficeWatchBackend();

runtime
  .start()
  .then((address) => {
    const port = typeof address === 'object' && address ? address.port : 'unknown';
    console.log(`OfficeWatch backend listening on port ${port}`);
  })
  .catch((error) => {
    console.error('Failed to start OfficeWatch backend', error);
    process.exitCode = 1;
  });

async function shutdown() {
  try {
    await runtime.stop();
    process.exit(0);
  } catch (error) {
    console.error('Failed to stop OfficeWatch backend cleanly', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});
