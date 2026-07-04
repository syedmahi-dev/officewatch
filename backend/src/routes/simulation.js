import { isDebugRoutesEnabled, normalizeRoomId, ROOMS } from '../config/officeLayout.js';
import { sendError } from './helpers.js';

export function registerSimulationRoute(app, options) {
  const { env, demoController } = options;

  app.get('/api/debug/simulation', (_request, response) => {
    if (!isDebugRoutesEnabled(env)) {
      sendError(response, 404, 'Debug routes are disabled.');
      return;
    }

    response.json(demoController.getSnapshot());
  });

  app.post('/api/debug/simulation', async (request, response) => {
    if (!isDebugRoutesEnabled(env)) {
      sendError(response, 404, 'Debug routes are disabled.');
      return;
    }

    try {
      const action = request.body?.action;
      const requestedRoom = request.body?.room;
      const room = requestedRoom ? normalizeRoomId(requestedRoom) : null;

      if (requestedRoom && !room) {
        throw new Error(`Unknown room '${requestedRoom}'. Valid rooms: ${ROOMS.join(', ')}`);
      }

      let result;
      switch (action) {
        case 'pause':
          result = await demoController.pause();
          break;
        case 'resume':
          result = await demoController.resume();
          break;
        case 'tick':
          result = await demoController.tickOnce();
          break;
        case 'set-clock':
          result = await demoController.setClockOverride(request.body?.at);
          break;
        case 'clear-clock':
          result = await demoController.clearClockOverride();
          break;
        case 'apply-preset':
          result = await demoController.applyPreset(request.body?.preset, {
            room: room ?? undefined,
            pause: request.body?.pause,
          });
          break;
        case 'reset':
          result = await demoController.resetBaseline();
          break;
        default:
          throw new Error(
            "Unknown simulation action. Valid actions: pause, resume, tick, set-clock, clear-clock, apply-preset, reset",
          );
      }

      response.json(result);
    } catch (error) {
      sendError(response, 400, error.message);
    }
  });
}
