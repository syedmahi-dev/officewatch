const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
app.use(cors());
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const devices = [];
const rooms = ['drawing', 'work1', 'work2'];
rooms.forEach(room => {
  for (let i = 1; i <= 2; i++) {
    devices.push({ id: `${room}-fan-${i}`, type: 'fan', room, status: Math.random() > 0.5 ? 'on' : 'off', powerDrawWatts: 60, lastChanged: new Date().toISOString() });
  }
  for (let i = 1; i <= 3; i++) {
    devices.push({ id: `${room}-light-${i}`, type: 'light', room, status: Math.random() > 0.5 ? 'on' : 'off', powerDrawWatts: 15, lastChanged: new Date().toISOString() });
  }
});

const usage = { totalWattsNow: 0, todayEstimatedKwh: 2.45 };
const alerts = [
  { id: '1', type: 'after-hours', room: 'work1', message: 'Work Room 1: 1 fan and 2 lights still on after hours.', triggeredAt: new Date().toISOString(), resolvedAt: null }
];

function updateUsage() {
  usage.totalWattsNow = devices.reduce((sum, d) => sum + (d.status === 'on' ? d.powerDrawWatts : 0), 0);
}
updateUsage();

app.get('/api/status', (req, res) => res.json(devices));
app.get('/api/usage', (req, res) => res.json(usage));
app.get('/api/alerts', (req, res) => res.json(alerts));
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptimeSeconds: process.uptime(), simulatorAlive: true }));

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.send(JSON.stringify({ type: 'full-state', payload: devices }));
  ws.send(JSON.stringify({ type: 'alert-new', payload: alerts[0] }));
});

setInterval(() => {
  devices.forEach(d => {
    if (Math.random() > 0.95) {
      d.status = d.status === 'on' ? 'off' : 'on';
      d.lastChanged = new Date().toISOString();
    }
  });
  updateUsage();
  
  const stateUpdate = JSON.stringify({ type: 'state-update', payload: devices });
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(stateUpdate);
  });
}, 5000);

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Mock Backend running on port ${PORT}`);
});
