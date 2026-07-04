export function registerHealthRoute(app, getHealthSnapshot) {
  app.get('/api/health', (_request, response) => {
    response.json(getHealthSnapshot());
  });
}
