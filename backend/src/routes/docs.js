export function registerDocsRoutes(app, openApiSpec) {
  app.get('/api/docs.json', (_request, response) => {
    response.json(openApiSpec);
  });

  app.get('/api/docs', (_request, response) => {
    response.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>OfficeWatch API Docs</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        font-family: "IBM Plex Sans", sans-serif;
        margin: 0;
        background: #f4f1e8;
        color: #1b1a17;
      }
      main {
        max-width: 960px;
        margin: 0 auto;
        padding: 48px 24px 64px;
      }
      h1, h2 {
        margin-bottom: 12px;
      }
      .card {
        background: #fffdf7;
        border: 1px solid #d8d1be;
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 18px;
      }
      code {
        background: #ece6d8;
        padding: 2px 6px;
        border-radius: 6px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      td, th {
        text-align: left;
        padding: 10px 8px;
        border-bottom: 1px solid #e5ddcd;
      }
      a {
        color: #095256;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>OfficeWatch API</h1>
      <p>REST endpoints, WebSocket contract, and a machine-readable OpenAPI document for the simulator backend.</p>
      <div class="card">
        <h2>REST Endpoints</h2>
        <table>
          <thead>
            <tr><th>Method</th><th>Path</th><th>Purpose</th></tr>
          </thead>
          <tbody>
            <tr><td>GET</td><td><code>/api/status</code></td><td>Full grouped office snapshot.</td></tr>
            <tr><td>GET</td><td><code>/api/room/:roomId</code></td><td>Single-room snapshot with normalized room lookup.</td></tr>
            <tr><td>GET</td><td><code>/api/usage</code></td><td>Live total watts and today's estimated kWh.</td></tr>
            <tr><td>GET</td><td><code>/api/alerts</code></td><td>Active and recently resolved alerts.</td></tr>
            <tr><td>GET</td><td><code>/api/health</code></td><td>Backend uptime, simulator heartbeat, and WebSocket client count.</td></tr>
            <tr><td>POST</td><td><code>/api/debug/force-alert</code></td><td>Trigger a gated demo alert when <code>ENABLE_DEBUG_ROUTES=true</code>.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <h2>WebSocket</h2>
        <p>Connect to <code>/ws</code>. The server sends <code>full-state</code> on connect, <code>state-update</code> every simulator tick, and dedicated alert events for create/resolve transitions.</p>
        <pre><code>{ type: "full-state", payload: Device[] }
{ type: "state-update", payload: Device[] }
{ type: "alert-new", payload: Alert }
{ type: "alert-resolved", payload: { id: string } }</code></pre>
      </div>
      <div class="card">
        <h2>OpenAPI</h2>
        <p>The machine-readable contract lives at <a href="/api/docs.json">/api/docs.json</a>.</p>
      </div>
    </main>
  </body>
</html>`);
  });
}
