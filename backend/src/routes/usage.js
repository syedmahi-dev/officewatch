export function registerUsageRoute(app, store) {
  app.get('/api/usage', (_request, response) => {
    response.json(store.getUsageSnapshot());
  });
}
