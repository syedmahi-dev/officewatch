# OfficeWatch Backend API Documentation

The backend now ships with two documentation surfaces:

- `GET /api/docs` for a quick human-readable overview in the browser
- `GET /api/docs.json` for the machine-readable OpenAPI 3.1 contract

## REST Summary

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/status` | Full office snapshot with grouped rooms, flat device list, and totals |
| `GET` | `/api/room/:roomId` | One room snapshot with normalized room aliases |
| `GET` | `/api/usage` | Current watts and today's estimated kWh |
| `GET` | `/api/alerts` | Active and recently resolved alerts |
| `GET` | `/api/health` | Backend uptime, simulator heartbeat, and WebSocket client count |
| `POST` | `/api/debug/force-alert` | Gated demo alert trigger when `ENABLE_DEBUG_ROUTES=true` |
| `GET` | `/api/debug/simulation` | Inspect the demo simulation controller state |
| `POST` | `/api/debug/simulation` | Pause/resume the simulator, set demo time, or apply a preset scenario |

## WebSocket Summary

Connect to `ws://<host>/ws`.

Message shapes:

```json
{ "type": "full-state", "payload": [Device] }
{ "type": "state-update", "payload": [Device] }
{ "type": "alert-new", "payload": Alert }
{ "type": "alert-resolved", "payload": { "id": "after-hours:work1" } }
```

The server sends:

- `full-state` immediately after a client connects
- `state-update` every simulator tick
- `alert-new` when an alert activates
- `alert-resolved` when an alert clears

## Notes

- Room identifiers accept natural aliases like `work room 1`, `workroom1`, and `1` on REST and Discord surfaces.
- The Discord bot is part of the same Node.js process, so it reads the exact same SQLite-backed store as the APIs.
- The simulator seeds 40–60% of devices as already on at startup to avoid an empty-looking demo.
- Successful Discord authentication is visible in the backend logs as `Discord bot ready as <bot-tag>`.
- If the backend cannot bind `HOST`/`PORT` because the address is already in use, Discord may still authenticate first; fix the port conflict and restart the single backend process so the API, WS hub, simulator, and bot stay aligned.
- Discord interactions support both explicit commands (`!status`, `!room`, `!usage`) and direct mention-style prompts such as `@OfficeWatch any fan running?` or `@OfficeWatch status of work room 1`.
- Humanized replies are deterministic summaries built from the live store. When a prompt is unclear, the bot replies with a short help message; when it sounds like a room request but the room name is unknown, it suggests the valid room ids instead of going silent.

## Demo Simulation Controls

When `ENABLE_DEBUG_ROUTES=true`, you can drive a dedicated demo simulation controller:

- `pause`: freeze automatic simulator mutations
- `resume`: return to live random simulation
- `tick`: advance one simulator tick manually
- `set-clock`: override the backend's effective local time for demoing office-hours logic
- `clear-clock`: return to real local time
- `apply-preset`: load a stable demo scenario
- `reset`: reseed the baseline randomized office state

Available presets:

- `baseline`
- `all-off`
- `after-hours-alert`
- `prolonged-on-alert`
- `mixed-anomaly`

Example:

```bash
curl -X POST http://127.0.0.1:3000/api/debug/simulation \
  -H "Content-Type: application/json" \
  -d '{"action":"apply-preset","preset":"mixed-anomaly","room":"work2","pause":true}'
```
