import { isDebugRoutesEnabled } from '../config/officeLayout.js';
import { requireKnownAlertType, requireKnownRoom, sendError } from './helpers.js';

export function registerDebugRoute(app, options) {
  const { env, alertEngine, wsHub, discordBot } = options;

  app.post('/api/debug/force-alert', async (request, response) => {
    if (!isDebugRoutesEnabled(env)) {
      sendError(response, 404, 'Debug routes are disabled.');
      return;
    }

    try {
      const type = requireKnownAlertType(request.body?.type);
      const room = requireKnownRoom(request.body?.room);
      const result = alertEngine.forceAlert(type, room);
      wsHub.broadcastAlertNew(result.alert);
      if (alertEngine.shouldNotify(result.alert)) {
        await discordBot.notifyAlert(result.alert);
      }
      response.json(result);
    } catch (error) {
      sendError(response, 400, error.message);
    }
  });
}
