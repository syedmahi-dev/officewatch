import { requireKnownRoom, sendError } from './helpers.js';

export function registerRoomRoute(app, store) {
  app.get('/api/room/:roomId', (request, response) => {
    try {
      const roomId = requireKnownRoom(request.params.roomId);
      response.json({
        generatedAt: new Date().toISOString(),
        room: store.getRoom(roomId),
      });
    } catch (error) {
      sendError(response, 404, error.message);
    }
  });
}
