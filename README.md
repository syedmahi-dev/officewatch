# 💡 OfficeWatch

> A live dashboard and Discord bot that watch every light and fan in a 3-room office, so nobody's boss has to ask "did someone leave the fan on again?" ever again.

Built for **Techathon Nationals & Rover Summit** (challenge: *"Lights, Fans, Discord: The Boss's Big Idea"*), hosted by IUT Robotics Society.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Discord Commands](#discord-commands)
- [Hardware / Circuit Concept](#hardware--circuit-concept)
- [Project Structure](#project-structure)
- [Known Limitations](#known-limitations)
- [Testing](#testing)
- [Demo](#demo)
- [License](#license)

---

## Overview

The office has 3 rooms — a Drawing Room and two Work Rooms — each with 2 fans and 3 lights (**15 devices total**). People forget to turn things off when they leave, the electricity bill climbs, and nobody notices until it's too late.

This system gives the whole office one live, always-accurate picture of every device's state and power draw, accessible two ways:

- 🖥️ **A real-time web dashboard** — live status, power meter, and anomaly alerts, updating without a page refresh
- 🤖 **A Discord bot** — the same live data, answerable on demand from wherever the team already talks

Both interfaces read from **one shared backend**, so they can never show conflicting information.

## Features

- ✅ Live status for all 15 devices, grouped by room, updating in real time over WebSocket
- ✅ Total + per-room power consumption meter (Watts) and an estimated daily kWh counter
- ✅ Automatic alerts for devices left on after office hours (9 AM–5 PM) and rooms left fully on for 2+ continuous hours
- ✅ Discord bot (`!status`, `!room <name>`, `!usage`) with humanized, friendly replies — never a raw data dump
- ✅ Proactive Discord alert notifications pushed to a designated channel
- ✅ Realistic, dynamic dummy data — no physical hardware required to run or judge this project
- ✅ Graceful degradation everywhere a network boundary exists: WebSocket reconnect-with-backoff, Discord gateway auto-reconnect, and input validation on every route

## Architecture

One backend process (Node.js) owns the only copy of device state. A software simulator drives realistic on/off and power-draw changes over time; a derived alert engine watches for anomalies; a WebSocket hub pushes live updates to the dashboard; and the Discord bot reads the exact same SQLite-backed store through a direct function call — not a network request — so the two interfaces are structurally incapable of disagreeing.

Full diagrams:
- [`diagrams/System_Architecture_Diagram.svg`](diagrams/System_Architecture_Diagram.svg) — vector version
- [`diagrams/System_Architecture_Diagram.md`](diagrams/System_Architecture_Diagram.md) — text/markdown version

Full design rationale, data model, API contracts, and edge-case handling: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express |
| Real-time transport | WebSocket (`ws`) |
| Discord bot | discord.js — runs in the **same process** as the backend |
| Dashboard | React |
| Data store | Local SQLite file (`node:sqlite`) behind one store API, no separate database service |
| Hardware concept | ESP32 + relays + ACS712 current sensor (Wokwi simulation — see below) |

## Getting Started

### Prerequisites
- Node.js 22+
- A Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications)) with the `MESSAGE CONTENT` intent enabled
- A Discord server where you can add the bot and designate an alerts channel

### Installation

```bash
git clone <this-repo-url>
cd officewatch

# backend (includes the Discord bot — same process, not a separate install)
cd backend
npm install

# dashboard
cd ../dashboard
npm install
```

### Configuration

Copy the example environment file and fill in your values:

```bash
cd backend
cp .env.example .env
```

See [Environment Variables](#environment-variables) below for what each value does.

### Running the system

```bash
# from /backend — starts REST API, WebSocket hub, simulator, alert engine,
# and the Discord bot together, in one process
npm start
```

The backend listens on `PORT` (default `3000`).
It also creates or reuses a local SQLite database at `backend/data/officewatch.sqlite` by default.

On a healthy startup, the bot logs `Discord bot ready as <bot-tag>` once Discord authentication completes. If startup fails with `EADDRINUSE` on `127.0.0.1:3000`, stop the existing process on that port or change `PORT` in `backend/.env` before retrying.

### Running the dashboard

```bash
cd dashboard
npm run dev
```

Open the printed local URL in your browser. The dashboard connects to the backend's `/ws` endpoint automatically and requests `/api/status` as a fallback if the socket hasn't connected within a few seconds.

## Environment Variables

All variables are read by the backend only (`/backend/.env`) — the dashboard has none, since it only ever talks to the backend's public HTTP/WS surface.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DISCORD_BOT_TOKEN` | ✅ | — | Bot token from the Discord Developer Portal |
| `DISCORD_ALERT_CHANNEL_ID` | ✅ | — | Channel ID where proactive alerts get posted |
| `HOST` | No | `127.0.0.1` | Bind host for the backend server. Set `0.0.0.0` when you want LAN/container access. |
| `PORT` | No | `3000` | Backend HTTP/WS port |
| `TICK_INTERVAL_MS` | No | `5000` | Simulator tick interval |
| `SQLITE_PATH` | No | `./data/officewatch.sqlite` | SQLite database path for persisted device state and usage counters. Use `:memory:` for ephemeral test or demo runs. |
| `NODE_ENV` | No | — | Set to `production` for a real deploy. Does **not** by itself control the debug route — see below. |
| `ENABLE_DEBUG_ROUTES` | No | `false` | Must be explicitly set to `true` to enable `/api/debug/force-alert`. This is the **only** switch for that route — it is independent of `NODE_ENV`, so a production deploy is safe by default and a demo box can opt in explicitly without also having to run in dev mode. |

Never commit a real `.env` file — it's excluded via `.gitignore`.

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | Full state of all 15 devices, grouped by room |
| `GET` | `/api/room/:roomId` | Status of one room (`drawing`, `work1`, `work2`) |
| `GET` | `/api/usage` | Current total wattage + today's estimated kWh |
| `GET` | `/api/alerts` | Active and recently resolved alerts |
| `GET` | `/api/health` | Backend + simulator liveness check |
| `GET` | `/api/docs` | Human-readable backend API reference page |
| `GET` | `/api/docs.json` | OpenAPI 3.1 document for the backend contract |
| `WS` | `/ws` | Live push: `full-state`, `state-update`, `alert-new`, `alert-resolved` |
| `POST` | `/api/debug/force-alert` | *(gated by `ENABLE_DEBUG_ROUTES=true`)* Manufactures a real alert on demand — useful for demo recording, returns `404` otherwise |
| `GET/POST` | `/api/debug/simulation` | *(gated by `ENABLE_DEBUG_ROUTES=true`)* Dedicated demo simulation controls: pause/resume, preset scenarios, manual tick, and clock override |

Full contract details (request/response shapes, validation rules, error handling): [`docs/ARCHITECTURE.md` §5](docs/ARCHITECTURE.md#5-api-specification).
Implementation-specific backend docs live in [`backend/API_DOCUMENTATION.md`](backend/API_DOCUMENTATION.md).

### Demo simulation system

For presentations, set `ENABLE_DEBUG_ROUTES=true` and use `/api/debug/simulation` to load stable scenarios like:

- `after-hours-alert`
- `prolonged-on-alert`
- `mixed-anomaly`
- `all-off`
- `baseline`

You can also pause the simulator, step one tick at a time, and override the effective local time so office-hours logic can be demonstrated on demand.

## Discord Commands

| Command | Example | What it does |
|---|---|---|
| `!status` | `!status` or `@OfficeWatch any fan running?` | Summary of all 3 rooms in one message |
| `!room <name>` | `!room work1` or `@OfficeWatch status of Work Room 1` | Status of a specific room — tolerant of natural phrasing |
| `!usage` | `!usage` or `@OfficeWatch how much power are we using?` | Current total wattage + today's estimated kWh |

Responses are humanized sentences, not raw data dumps — the bot always replies with something useful even if a command is malformed. The bot supports both bang commands and direct `@OfficeWatch` mention-style questions for the same core actions.

The conversational layer stays grounded in the live backend data: it phrases replies more naturally, focuses on a single room when your message names one, and falls back to a short helpful suggestion instead of silently ignoring unclear prompts.

Quick verification after startup:

- Confirm the backend logs `Discord bot ready as <bot-tag>`
- Run `!status`
- Run `!room Work Room 1`
- Run `!usage`

## Hardware / Circuit Concept

No physical hardware is required to run or judge this project — all device data is realistically simulated in software. For the required circuit schematic, this project designs (in Wokwi) a representative wiring concept for one room, showing how an ESP32 would read manual toggle switches, drive relays for real fans/lights, and sense actual current draw via an ACS712 sensor.

- [`diagrams/Circuit_Wiring_Diagram.svg`](diagrams/Circuit_Wiring_Diagram.svg) / [`.md`](diagrams/Circuit_Wiring_Diagram.md) — wiring reference and pin mapping
- [`diagrams/Component_List.md`](diagrams/Component_List.md) — full bill of materials
- Live Wokwi project: https://wokwi.com/projects/468599586267266049

**This schematic is a concept artifact.** The deployed demo's live data comes entirely from the software simulator described in `docs/ARCHITECTURE.md` §4 — no physical or virtual hardware is required to run this project.

## Project Structure

```
.
├── backend/
│   └── src/
│       ├── config/officeLayout.js   # rooms, device counts, aliases, tick interval — single source of constants
│       ├── deviceStore.js            # the one writer function + all reads, backed by SQLite persistence
│       ├── simulator.js              # generates live device data
│       ├── alertEngine.js            # derives anomalies from device state
│       ├── routes/                   # REST endpoints
│       ├── ws/hub.js                 # WebSocket broadcast
│       ├── discord/                  # bot client + commands (same process as the API)
│       └── server.js                 # single entrypoint
├── dashboard/
│   └── src/                          # React app
├── diagrams/                         # all system + circuit diagrams, component list
├── docs/
│   ├── ARCHITECTURE.md               # full design documentation
│   └── FRONTEND_BUILD_INSTRUCTIONS.md # dashboard build contract
├── AGENTS.md                          # rules followed during AI-assisted development
└── .gitignore
```

## Known Limitations

Documented explicitly rather than left for a reviewer to discover:

- No authentication on the API/WebSocket/dashboard — acceptable for a demo, would be a first addition for production use.
- Recent resolved alerts and Discord notification cooldowns are recalculated after a backend restart; only device state and usage counters are persisted.
- Daylight Saving Time transitions aren't specially handled in the "2 hours continuously on" alert math.
- One backend process handles everything by design, for guaranteed data consistency between the dashboard and bot — a production deployment at real scale would separate these with a shared data layer.

Full list with reasoning: [`docs/ARCHITECTURE.md` §11](docs/ARCHITECTURE.md).

## Testing

```bash
cd backend
npm test
```

Covers the device store's write validation, alert-engine boundary conditions (e.g., 1h59m vs. 2h01m of continuous "on" time), and REST route input validation. See [`docs/ARCHITECTURE.md` §10](docs/ARCHITECTURE.md) for the full manual + automated validation plan, including WebSocket reconnect and Discord bot resilience checks.

## Demo

📹 Video walkthrough: `<add your video link here>`

## License

`<add your chosen license here — e.g. MIT>`

---

Built for **Techathon Nationals & Rover Summit** by IUT Robotics Society.
