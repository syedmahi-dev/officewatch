import { WebSocket, WebSocketServer } from 'ws';

function sendJson(socket, message) {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(message));
}

export function createWebSocketHub(options) {
  const { server, getFullState, logger = console } = options;
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set();

  wss.on('connection', (socket) => {
    clients.add(socket);
    sendJson(socket, {
      type: 'full-state',
      payload: getFullState(),
    });

    socket.on('close', () => {
      clients.delete(socket);
    });

    socket.on('error', (error) => {
      logger.error('WebSocket client error', error);
      clients.delete(socket);
    });
  });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (upgradedSocket) => {
      wss.emit('connection', upgradedSocket, request);
    });
  });

  return {
    broadcastState(devices) {
      for (const client of clients) {
        sendJson(client, {
          type: 'state-update',
          payload: devices,
        });
      }
    },
    broadcastAlertNew(alert) {
      for (const client of clients) {
        sendJson(client, {
          type: 'alert-new',
          payload: alert,
        });
      }
    },
    broadcastAlertResolved(id) {
      for (const client of clients) {
        sendJson(client, {
          type: 'alert-resolved',
          payload: { id },
        });
      }
    },
    getClientCount() {
      return clients.size;
    },
    close() {
      for (const client of clients) {
        client.close();
      }
      clients.clear();
      wss.close();
    },
  };
}
