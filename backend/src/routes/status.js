export function registerStatusRoute(app, store) {
  app.get('/api/status', (_request, response) => {
    response.json(store.getStatusSnapshot());
  });
}
