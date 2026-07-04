export function registerAlertsRoute(app, alertEngine) {
  app.get('/api/alerts', (_request, response) => {
    response.json({
      generatedAt: new Date().toISOString(),
      ...alertEngine.getSnapshot(),
    });
  });
}
