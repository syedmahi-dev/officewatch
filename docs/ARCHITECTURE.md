# OfficeWatch — Design Documentation (v1.3)
**Project:** OfficeWatch — built for the "Lights, Fans, Discord: The Boss's Big Idea" hackathon challenge
**Source spec:** Hackathon_Problem_Statement__Preliminary_Round__v1_2.pdf
**Purpose:** Complete technical design handed off for implementation. Every section states assumptions explicitly so the coding phase requires zero guessing.

> **✅ Device count confirmed:** 15 devices total — 5 per room (2 fans + 3 lights) × 3 rooms. The source spec's "Office Setup" section states 15 total, while other sections and the office layout image state 18 (implying 6/room). **Resolved: 15 is correct.** All constants, pin mappings, and diagrams below use 15. If the printed office layout image's "Total Devices: 18" callout is included in the submission, note in the README that it's a leftover typo from an earlier draft of the spec, not a discrepancy in this system.
>
> **This is the single canonical architecture document.** An earlier draft of this doc existed under a different filename with near-identical content; that draft has been retired. This file, at `docs/ARCHITECTURE.md`, is the only one that should be edited or referenced going forward.

---

## 0. Evaluation Criteria Coverage Matrix

Mapped directly against the hackathon's weighted rubric, so every graded line item has a traceable owner in this document. Use this as a pre-submission checklist.

| Rubric criterion | Weight | Covered by | Status |
|---|---|---|---|
| Working web dashboard with real-time data | 20% | §5.2 (WebSocket protocol), §9 (dashboard folder structure), §10 (WS validation test) | Fully specified |
| Working Discord bot reflecting real simulated data | 10% | §7 (bot commands + resilience), §4.1 (room alias normalization), §2 (single-process guarantee of identical data) | Fully specified |
| Dashboard visuals and UX quality | 10% | §6 (WS-disconnect freeze behavior), problem statement's office layout view (bonus — glow/animate), §9 (`OfficeLayoutView` component) | Specified; visual polish is an implementation-time craft decision, not a design gap |
| Clear, correct system diagram | 15% | §2 (diagram + flow narrative + process-boundary correction) | Fully specified |
| Sensible circuit schematic | 15% | §3 (component list, pin mapping, electrical reasoning, firmware logic) | Fully specified |
| Quality of demo & dummy data simulation | 15% | §4 (data model, boot-seeding, invariants), §6 (alert triggers), demo-script note in §2 | Fully specified — see note below on forcing an after-hours alert for the video |
| Well-structured, documented codebase & commits | 15% | §9 (folder structure), `AGENTS.md` (commit hygiene, §8), §10 (test plan) | Fully specified |

**Demo-recording note (affects the 15% simulation-quality score directly):** if you record the video demo during 09:00–17:00, the `after-hours` alert will never fire naturally, and the judges won't see it work. Use the `/api/debug/force-alert` route (§5.1) to demonstrate the alert firing on camera without needing to actually stay late. Document this hook in the README as a testing/demo aid, not a production feature.

---

Hackathon judging rewards a system that **never visibly breaks** during a live demo more than one with extra features. The guiding principle here: **one source of truth, one process, narrow interfaces, defensive edges.**

- Single backend process. No microservices, no message queue, no separate database service to operate for the demo.
- Every mutation to device state goes through exactly one function.
- Every external-facing surface (REST route, WS message, Discord command) validates input and never throws unhandled.
- Reconnect and degrade gracefully everywhere a network boundary exists (WebSocket, Discord gateway).

---

## 2. High-Level System Diagram (description for manual drawing)

Draw this as four vertical swim-lanes, left to right, with arrows showing data flow direction. (Do not use Mermaid per the problem statement — draw in draw.io / Excalidraw / PowerPoint.)

```
┌─────────────────┐     ┌───────────────────────────────────┐     ┌───────────────────┐     ┌───────────────┐
│  SIMULATED       │     │   BACKEND — ONE Node.js PROCESS     │     │   WEB DASHBOARD    │     │   END USER    │
│  DEVICE LAYER    │     │                                      │     │                    │     │               │
│                  │     │  ┌──────────────────┐                │     │  React SPA         │     │  Boss / staff │
│  15 virtual      │────▶│  │  Device Store     │                │────▶│  - Live status     │────▶│  viewing      │
│  devices         │     │  │  (SQLite-backed,  │                │ WS  │  - Power meter     │     │  browser      │
│  (2 fans +       │     │  │  writer function) │                │     │  - Alerts panel    │     │               │
│  3 lights ×      │     │  └──────────────────┘                │     │  - Office layout   │     │               │
│  3 rooms)        │     │           │                          │     └───────────────────┘     └───────────────┘
│                  │     │           ▼                          │
│  Simulator tick  │     │  ┌──────────────────┐                │     ┌───────────────────┐     ┌───────────────┐
│  (5s interval,   │     │  │  Alert Engine     │                │     │   DISCORD BOT      │     │   End User    │
│  seeded boot     │     │  │  (derived, keyed   │  in-process   │────▶│  (same process —   │────▶│   Boss on     │
│  state, random   │     │  │  by type+room)     │  call, no     │     │   !status          │     │   Discord     │
│  on/off + power) │     │  └──────────────────┘  network hop    │     │   !room <name>     │     └───────────────┘
└─────────────────┘     │           │                          │     │   !usage           │
                         │           ▼                          │     │   proactive alerts) │
                         │  ┌──────────────────┐                │     └───────────────────┘
                         │  │ REST API + WS Hub │                │
                         │  └──────────────────┘                │
                         └───────────────────────────────────┘
```

**Flow narrative (for the diagram caption / video demo script):**
1. Simulator mutates a device's `status`/`power`/`lastChanged` inside the Device Store on a timer.
2. Every mutation emits an internal event.
3. The WS Hub pushes the updated state to all connected dashboard clients immediately — no polling needed on the dashboard.
4. The Discord bot, on command, pulls the *same* Device Store via an in-process function call (not a network hop, since it's one process) — guaranteeing both interfaces show identical data at all times.
5. The Alert Engine runs after every simulator tick, derives alert conditions from current state, and pushes new alerts to (a) the dashboard's alerts panel via WS and (b) optionally a designated Discord channel.

> **Process-boundary note:** the discord.js client is initialized and started inside the *same* Node process as the Express server and WebSocket hub (see Section 9's folder structure). It is not a separate deployable service. This is a deliberate consistency guarantee, not just an organizational choice — the moment the bot lives in a different process, "guaranteeing identical data" stops being automatically true and instead depends on a network call that can fail, time out, or return stale data. Keeping it in-process removes an entire class of bugs for zero added complexity at this scale.

---

## 3. Hardware / Electrical Schematic (for Wokwi/Tinkercad — build this manually)

**Assumption:** One representative room (Work Room 1: 2 fans + 3 lights = 5 devices) is wired. The other two rooms are conceptually identical — call this out in the README rather than duplicating wiring, per the spec ("a representative circuit ... is enough").

### 3.1 Component list
| Component | Qty | Purpose |
|---|---|---|
| ESP32 DevKit | 1 | Microcontroller, reads state, could push over WiFi |
| Relay module (5V, 2-channel or use 2× 1-channel) | 2 | Switches fan loads (simulated AC loads) |
| Relay module (5V) | 3 | Switches light loads |
| ACS712 current sensor (5A or 20A variant) | 1 (shared bus) | Reads current draw for the representative load line |
| LEDs (as light stand-ins in simulation) | 3 | Visual proxy for "light" in Wokwi since AC bulbs aren't simulated |
| DC motor or buzzer (as fan stand-in) | 2 | Visual proxy for "fan" in Wokwi |
| Push buttons | 5 | Manual on/off toggle simulating a human flipping a switch, so the ESP32 has an input to read |
| Pull-down resistors (10kΩ) | 5 | Debounce/default-low for buttons |

### 3.2 Pin mapping table (ESP32, one room = 5 controllable devices, 2 fans + 3 lights)
| Device | Function | ESP32 GPIO | Notes |
|---|---|---|---|
| Fan 1 | Relay control (output) | GPIO 5 | Drives relay coil via transistor/relay module input |
| Fan 1 | Manual toggle (input) | GPIO 18 | Button, INPUT_PULLDOWN |
| Fan 2 | Relay control (output) | GPIO 4 | |
| Fan 2 | Manual toggle (input) | GPIO 19 | Button, INPUT_PULLDOWN |
| Light 1 | Relay control (output) | GPIO 2 | Drives LED or relay |
| Light 1 | Manual toggle (input) | GPIO 21 | Button, INPUT_PULLDOWN |
| Light 2 | Relay control (output) | GPIO 15 | |
| Light 2 | Manual toggle (input) | GPIO 22 | Button, INPUT_PULLDOWN |
| Light 3 | Relay control (output) | GPIO 13 | |
| Light 3 | Manual toggle (input) | GPIO 23 | Button, INPUT_PULLDOWN |
| Current sensor (shared) | Analog input | GPIO 34 (ADC1_CH6) | ACS712 output → analog-in; scale reading to Watts in firmware |
| Status LED (heartbeat/health indicator) | Digital output | GPIO 27 | Blinks to show ESP32 is alive — cheap way to visually confirm "device didn't crash" during demo |

**Pin conflict fixed (previously an error in an earlier draft):** an earlier draft of this schematic assigned GPIO 2 to both Light 1's relay control *and* the heartbeat status LED — two circuits driving one pin, which would either short-fight or make Light 1 flicker with the heartbeat pattern instead of reflecting its actual on/off state. The status LED is now on GPIO 27, a pin with no other assignment.

**Strapping-pin caution (why this matters even though the numbers "work" on paper):** GPIO 0, 2, 5, 12, and 15 are ESP32 boot-mode strapping pins — their voltage level at power-on/reset influences how the chip boots. GPIO 2 and GPIO 15 are used here for Light 1 and Light 2 relay control. In practice this is usually fine (most relay modules present a high-impedance or predictable state at power-on), but if you see erratic boot behavior or a relay clicking briefly on power-up, that's why — it's a known ESP32 quirk, not a wiring mistake. If it causes problems, swap Light 1/Light 2 to GPIO 25/26 instead and update this table.

### 3.3 Electrical reasoning
- **Relays isolate low-voltage logic (3.3V ESP32) from higher-voltage loads.** Never drive a fan/light directly from a GPIO — GPIOs source/sink only a few mA; relay coils need a transistor driver stage (most relay modules bundle this already).
- **ACS712 measures current via the Hall-effect principle**, sitting in series with the load's live wire. Output is an analog voltage proportional to current; the ESP32 ADC reads it and firmware converts `voltage → amps → watts (P = V × I, assume 220V mains)`.
- **Debounce is required** on manual toggle buttons — mechanical switches bounce for a few ms, which would register as multiple on/off events. Either use a 10kΩ pull-down + 100nF capacitor (hardware debounce) or debounce in firmware with a 50ms ignore-window.
- **Why buttons at all if this is a demo/simulation?** They give a physically plausible "human flips the switch" input path so the schematic reads as a real system, not just a chip talking to relays with no input source. In the actual simulated backend, buttons are irrelevant — this schematic is a **concept artifact**, not the data source for the dashboard.

### 3.4 What the firmware conceptually does (no code needed for the schematic, just the logic)
1. Read each toggle button state.
2. On state change (post-debounce), flip the corresponding relay output.
3. Read ACS712 periodically (e.g., every 500ms), convert to Watts.
4. (If actually networked) POST `{ deviceId, status, powerDraw, timestamp }` to the backend API.
5. Note explicitly in the README: **"This schematic demonstrates the real-world data path; the deployed demo uses the software simulator described in Section 4, not this hardware."**

---

## 4. Data Model

### 4.1 Device inventory (constants)
```
ROOMS = ["drawing", "work1", "work2"]
DEVICES_PER_ROOM = { fans: 2, lights: 3 }   // = 5 devices per room
TOTAL_DEVICES = 15   // 5 devices/room × 3 rooms — confirmed count, see banner at top of document
```
**Implementation note:** keep this as a single exported constants object (`config/officeLayout.js`), never hardcode "15" inline anywhere else in the codebase. This is the only place device counts are defined.

**Room identifier normalization (closes a real bug class):** the canonical room IDs are `drawing`, `work1`, `work2` — lowercase, no spaces. Both the REST API and the Discord bot must normalize incoming room references before lookup: lowercase, trim whitespace, strip spaces, and map through an alias table:
```
ROOM_ALIASES = {
  "drawing": "drawing", "drawingroom": "drawing", "drawing room": "drawing",
  "work1": "work1", "workroom1": "work1", "work room 1": "work1", "1": "work1",
  "work2": "work2", "workroom2": "work2", "work room 2": "work2", "2": "work2"
}
```
This matters specifically for Discord: `!room Work Room 1` will arrive to the command handler as multiple space-separated arguments (`["Work", "Room", "1"]`), not one string — the handler must re-join args before normalizing, or it will always 404 on multi-word input. Without this, the example command in the spec's own table (`!room work1`) works, but any natural variation a real user types does not — and "graceful handling of reasonable input variation" is exactly what separates a robust submission from a brittle one.

### 4.2 Device object (single source of truth shape)
```
Device {
  id: string            // e.g. "drawing-fan-1", "work1-light-3" — stable, human-legible
  type: "fan" | "light"
  room: "drawing" | "work1" | "work2"
  status: "on" | "off"
  powerDrawWatts: number    // realistic constant per type: fan=60W, light=15W (0 when off)
  lastChanged: ISO8601 string
}
```

**Design decision:** `powerDrawWatts` is 0 when off, and a fixed nominal value when on (60W fan, 15W light) rather than a randomized value — realistic devices don't vary wattage per second, only per on/off transition. Add ±5% jitter only if you want the power meter to look "alive" even with no toggles — optional, not required.

**Defensive invariant (even though only the simulator writes state):** the single writer function should still assert `room ∈ ROOMS`, `type ∈ {fan, light}`, `status ∈ {on, off}`, and `powerDrawWatts >= 0` before committing a write, and reject/log-and-skip anything that fails. This isn't paranoia about the simulator itself — it's insurance against a future refactor (e.g., someone wiring the manual-override buttons from Section 3 into the writer) silently introducing a bad value that then corrupts the power meter (negative totals) or crashes a room lookup downstream.

**Boot-time initial state:** do not initialize all 15 devices to `off`. A cold-start dashboard showing an all-dark office for the first N seconds of a live demo reads as broken, not idle. Seed initial state with roughly 40–60% of devices randomly `on` at process start, each with a `lastChanged` staggered a few minutes into the past (not all identical) so the alerts panel and "time on" displays don't all show `0s` simultaneously on first load.

### 4.3 Derived / computed values (never stored, always calculated on read)
- `roomPower(room)` = sum of `powerDrawWatts` for all devices in that room.
- `totalPower()` = sum across all devices.
- `estimatedKwhToday()` = running integral — sample total power every minute and accumulate `Wh += powerNow × (intervalMinutes/60)`, stored as a single running counter reset at midnight.

**Persistence note:** device state and the running `estimatedKwhToday` counter are persisted in a local SQLite file, so a backend restart resumes from the last committed snapshot instead of silently resetting the office state mid-demo. Recently resolved alerts and notification cooldown timestamps remain in-memory-only and are rebuilt from fresh evaluation after restart.

### 4.4 Alert object
```
Alert {
  id: string
  type: "after-hours" | "prolonged-on"
  room: string
  message: string             // human-readable, generated at trigger time
  triggeredAt: ISO8601 string
  resolvedAt: ISO8601 string | null
}
```
Alerts are **derived, not hand-maintained** — the Alert Engine recomputes active conditions each tick and diffs against previously-known alerts to decide what's new (→ push notification) vs. ongoing (→ stays in panel) vs. resolved (→ marked resolved, removed from "active" list after a grace period).

**Alert granularity (closes a flooding risk):** alerts are keyed by `(type, room)`, not per-device. If 4 devices in `work2` are left on after hours, that's **one** `after-hours` alert for `work2`, not four. The alert's `message` field summarizes which devices, e.g., "Work Room 2: 2 fans and 2 lights still on after hours." Without this rule, a room left fully on overnight would spam the Discord channel and dashboard with a separate alert per device — technically correct, practically unusable.

**Alert resolution triggers:**
- `after-hours` for a room resolves when every device in that room that was contributing to the alert turns `off`, OR when the clock re-enters 09:00–17:00 (whichever happens first).
- `prolonged-on` for a room resolves the moment any device in that room turns `off` (since the rule requires *all* devices on continuously — one flip breaks the condition), or naturally re-triggers later if the room returns to a fully-on state for another 2+ hours.
- Both alert types are independent and non-exclusive: a room can be in both an `after-hours` and a `prolonged-on` alert state simultaneously if it qualifies for both — this is expected, not a bug to suppress.

---

## 5. API Specification

### 5.1 REST endpoints
| Method | Path | Description | Failure modes handled |
|---|---|---|---|
| GET | `/api/status` | Full state: all devices grouped by room | none expected — always returns 200 |
| GET | `/api/room/:roomId` | Devices for one room | `404` if `roomId` not in `{drawing, work1, work2}`, with body `{error: "Unknown room 'x'. Valid rooms: drawing, work1, work2"}` |
| GET | `/api/usage` | `{ totalWattsNow, todayEstimatedKwh }` | none expected |
| GET | `/api/alerts` | Active + recently resolved alerts | none expected |
| GET | `/api/health` | `{ status: "ok", uptimeSeconds, simulatorAlive: bool }` | Used by the dashboard to show a "backend healthy" indicator; also useful during the demo to prove nothing silently died |
| POST | `/api/debug/force-alert` | Manufactures an active alert of the given `{type, room}` on demand, without waiting for real conditions (office hours or a 2-hour window) to occur naturally | Returns `404` unless `ENABLE_DEBUG_ROUTES=true` is set in the environment |

**Debug-route gating rule (single, explicit switch — no alternate path):** this route is only reachable when `process.env.ENABLE_DEBUG_ROUTES === 'true'`. This is deliberately **not** tied to `NODE_ENV`, so that:
- a production deploy is safe by default (the flag defaults to unset/false), and
- a demo/recording box can opt in explicitly, without also having to run the whole backend in a non-production mode just to unlock this one route.

**Why this route exists and is documented rather than left as an ad-hoc hack:** Section 0's demo-recording note flagged that the `after-hours` alert can't be shown on camera if you record between 9–5, and `prolonged-on` requires an unrealistic 2-hour wait either way. Rather than an undocumented workaround (or faking the alert panel with hardcoded UI, which would misrepresent "quality of simulation" to a judge), this gives a real, gated, one-line-to-call endpoint that exercises the actual alert engine and WS/Discord push paths end-to-end — the alert it produces is genuine, just triggered on demand instead of waited for.

**`simulatorAlive` definition:** `true` if `now - lastSuccessfulTickTimestamp < 2 × TICK_INTERVAL_MS`, else `false`. This gives a concrete, testable definition rather than leaving "alive" open to interpretation — you can deliberately break the simulator during a test and watch this flip to `false` within one missed tick window.

**Input validation rule (applies to every route):** never trust path/query params — validate against an allow-list (the 3 known room IDs), return structured JSON errors with HTTP 4xx, never let a bad param reach an array/object lookup that could throw.

### 5.2 WebSocket protocol
- Endpoint: `/ws`
- On connect: server immediately sends a `full-state` message so the client never renders an empty dashboard while waiting for the next tick.
- On every simulator tick: server broadcasts `state-update` with full state (simplest, fine at this device count).
- **Tick interval: fixed at 5 seconds.** Broadcast fires on *every* tick regardless of whether any device actually changed state — this doubles as a WS keep-alive/heartbeat and lets the dashboard's "last updated" timestamp stay meaningfully live even during quiet periods, rather than the client having to guess if the connection silently died.
- On alert trigger: server broadcasts `alert-new` separately from state updates, so the dashboard can toast/highlight it distinctly.

```
// Server → Client message shapes
{ type: "full-state", payload: Device[] }
{ type: "state-update", payload: Device[] }
{ type: "alert-new", payload: Alert }
{ type: "alert-resolved", payload: { id: string } }
```

**Reconnect contract:** client is responsible for exponential backoff (e.g., 1s, 2s, 4s, max 10s) and must request `full-state` again on reconnect — server does not queue missed messages for disconnected clients (out of scope for demo scale, explicitly documented as a known limitation).

---

## 6. Alert Logic (exact rules — no ambiguity for implementation)

| Rule | Condition | Trigger check |
|---|---|---|
| After-hours | Any device `status == "on"` AND current time is outside 09:00–17:00 local | Checked every tick |
| Prolonged-on | **All** devices in a room are `"on"` continuously for > 2 hours (i.e., `now - lastChanged > 2h` for every device in the room, all currently on) | Checked every tick |

**Boundary semantics:** office hours are **inclusive of 09:00:00, exclusive of 17:00:00** — i.e. `isOfficeHours = (time >= 09:00:00 && time < 17:00:00)`. So a device still on at exactly 17:00:00 counts as after-hours; a device on at exactly 09:00:00 does not. This specific inequality direction is arbitrary but must be picked once and used consistently — the risk otherwise is the alert flickering on/off for one tick right at the boundary if two code paths implement the comparison differently.

**Edge cases to explicitly handle:**
- What if only *some* devices in a room have been on 2+ hours, not all? → Does **not** trigger "prolonged-on" per the literal spec wording ("a room where all devices have been on"). Documented interpretation — not ambiguous to a grader.
- What if a device flips off and back on right at the 2-hour boundary? → `lastChanged` resets on every status flip, so the 2-hour clock restarts. This is correct/intended behavior — a flip means someone touched it.
- Midnight rollover for `estimatedKwhToday`: reset the accumulator at local midnight (use a stored "day" marker, compare on each tick, reset if the day has changed).
- Timezone: **assumption — use server local time for "office hours."** State this assumption explicitly; do not silently assume UTC.
- Daylight Saving Time transitions can cause a "spring forward" hour to be skipped or a "fall back" hour to be counted twice in continuous-on duration math. **Accepted, documented limitation** for hackathon scope — not worth the added complexity of DST-safe interval arithmetic for a demo that runs once. State this in the README rather than silently hoping it doesn't come up.
- Dashboard visual behavior on WebSocket disconnect (bonus office-layout view): animated lights/fans must **freeze at their last-known state**, not reset to a default "all off" appearance, while disconnected — resetting to a default would visually lie about device state during the exact window the connection can't confirm anything.

---

## 7. Discord Bot Specification

| Command | Behavior | Error handling |
|---|---|---|
| `!status` / `@OfficeWatch any fan running?` | Human-readable summary of all 3 rooms, generated from live data | If backend state is somehow empty (startup race), reply "Still warming up, try again in a few seconds" instead of crashing |
| `!room <name>` / `@OfficeWatch status of work room 1` | Status of one room | Unknown room name → friendly reply listing valid options (`drawing`, `work1`, `work2`), not a stack trace |
| `!usage` / `@OfficeWatch how much power are we using?` | Current total watts + today's kWh estimate | Same graceful fallback as `!status` |

**Humanized responses:** template the raw data into a sentence (e.g., via a small formatting function, or an LLM call if you want the bonus tone quality). Either way, **never expose raw JSON to the user** — that's an instant point loss on "responses should be humanized."

**Invocation rule:** support both the explicit bang commands above and direct mentions that clearly ask for status, room, or usage information. If a mention does not map cleanly to one of those intents, reply with a short help message instead of silently ignoring it.

**Interaction rule:** when a prompt clearly names one room, answer with that room only instead of dumping the whole office status. If the prompt looks like a room question but the room name does not resolve, return a friendly suggestion with the valid room identifiers.

**Resilience requirements:**
- Wrap every command handler in try/catch; on unexpected error, log server-side and reply with a generic apologetic message — never let the bot go silent or crash the gateway connection.
- Register `client.on('error')` and reconnect-on-disconnect handling (discord.js handles most reconnection automatically — verify, don't assume).
- Rate-limit proactive alert pushes: track `lastNotifiedAt` per alert `type+room` pair, and don't re-post the same ongoing alert more than once per, e.g., 30 minutes, even if it's still active on every tick.

---

## 8. Concurrency & Failure Handling (why this holds up under pressure)

| Risk | Mitigation |
|---|---|
| Simulator tick overlaps with a slow subscriber broadcast | Single-threaded Node event loop + all state writes synchronous — no true parallelism to race against. Add an `isTicking` guard purely for readability/safety if async work is introduced later. |
| WebSocket client floods reconnect attempts | Client-side exponential backoff (Section 5.2) |
| Discord API rate limit / transient outage | discord.js built-in queueing; wrap sends in try/catch so a failed proactive push doesn't crash the alert engine |
| Backend process crash | Not solvable at hackathon scope without infra (out of scope) — but `/api/health` gives visible proof of life during the demo, and all handlers use try/catch so a single bad input can't take the whole process down |
| Bad/malicious input on REST routes | Allow-list validation (Section 5.1), never string-concat into lookups |
| Dashboard rendering stale data forever after a missed WS message | `full-state` resync on reconnect (Section 5.2); consider a periodic (e.g., every 30s) REST fallback poll as a belt-and-suspenders measure |

---

## 9. Suggested Folder Structure

```
/backend
  /src
    config/
      officeLayout.js       // ROOMS, DEVICES_PER_ROOM, TOTAL_DEVICES, ROOM_ALIASES, TICK_INTERVAL_MS (Sections 4.1, 5.2)
    deviceStore.js           // SQLite-backed single source of truth + the one writer function (with invariant checks, Section 4.2)
    simulator.js             // interval-driven state mutation + boot-time seeding (Section 4.2)
    alertEngine.js           // derived alert computation, keyed by (type, room) — Section 4.4
    routes/
      status.js
      room.js
      usage.js
      alerts.js
      health.js
      debug.js               // /api/debug/force-alert, gated by ENABLE_DEBUG_ROUTES (Section 5.1)
    ws/
      hub.js                 // broadcast logic, connection tracking
    discord/
      bot.js                 // discord.js client, started from the SAME process as server.js — see Section 2 note
      commands/
        status.js
        room.js
        usage.js
      responseFormatter.js   // humanizes raw data into sentences
    server.js                 // single entrypoint: wires REST + WS + simulator + discord bot together, in one process
  .env.example
/dashboard
  /src
    components/
      DeviceStatusPanel
      PowerMeter
      AlertsPanel
      OfficeLayoutView        // bonus visual layer
    hooks/
      useWebSocket.js          // reconnect-with-backoff logic lives here
/diagrams
  System_Architecture_Diagram.svg / .md
  Circuit_Wiring_Diagram.svg / .md
  Component_List.md
/docs
  ARCHITECTURE.md (this document — the only one)
  FRONTEND_BUILD_INSTRUCTIONS.md
AGENTS.md
README.md
.gitignore
```

---

## 10. Validation / Testing Plan

| Component | How to validate |
|---|---|
| Device store writer | Unit test: call `updateDevice` with valid/invalid IDs, confirm rejection of unknown IDs, confirm `lastChanged` updates |
| Alert engine | Unit test with mocked timestamps: feed a device state "on" with `lastChanged` 3 hours ago, confirm `prolonged-on` fires; feed 1h59m, confirm it doesn't |
| REST routes | Manual/curl test each route with valid input, invalid room name, malformed query param; confirm `/api/debug/force-alert` 404s when `ENABLE_DEBUG_ROUTES` is unset |
| WebSocket | Open two browser tabs, confirm both update simultaneously on a simulator tick; kill server, confirm client shows "reconnecting" and recovers on restart |
| Discord bot | Manually run each command in a test server; disconnect network briefly to confirm reconnect; send `!room doesnotexist` to confirm graceful reply |
| End-to-end | Toggle a device via simulator/manual override, confirm dashboard AND `!status` reflect the identical change within one tick interval |

---

## 11. Open Assumptions Log (carry into README as-is)

1. **Device count confirmed at 15 total (5/room: 2 fans + 3 lights).** The source spec's "18" mentions elsewhere (Simulated Device Data section, Live Device Status Panel, office layout image) are treated as leftover typos from an earlier draft.
2. Office hours fixed at 09:00–17:00 **server local time**.
3. Mains voltage assumed 220V for wattage-from-current calculations in the hardware schematic (adjust if your region differs — call it out either way).
4. `estimatedKwhToday` resets at local midnight, but survives backend restarts because the store is persisted in local SQLite (Section 4.3).
5. "Prolonged-on" alert requires **all** devices in a room on for 2+ continuous hours, not "some."
6. One backend process handles the REST API, WebSocket hub, simulator, alert engine, **and** the Discord bot — a single Node process, not separate services (Section 2, Section 9). This is a deliberate consistency guarantee, documented as a scaling limitation for a future multi-instance deployment, not an oversight.
7. No authentication/authorization layer — acceptable for a demo; noted as a "next step" in README for engineering-maturity points.
8. Simulator tick interval fixed at 5 seconds; state is broadcast every tick regardless of whether anything changed (Section 5.2).
9. Alerts are deduplicated per `(type, room)`, not per device — one alert can represent multiple devices (Section 4.4).
10. DST transitions are not specially handled in continuous-on-duration math — accepted limitation (Section 6).
11. Room identifiers are normalized (lowercase, trimmed, alias-mapped) before lookup on both the REST API and the Discord bot, to tolerate natural-language variations like "Work Room 1" (Section 4.1).
12. The Discord bot token env var is named `DISCORD_BOT_TOKEN` — this is the single canonical name; no code or doc should use `DISCORD_TOKEN` or any other variant.
13. The debug route is gated by exactly one flag, `ENABLE_DEBUG_ROUTES=true`, independent of `NODE_ENV` (Section 5.1) — this was previously an ambiguous "either/or" and is now fixed to one rule.

---

## 12. Edge Case & Logical Consistency Audit (summary)

This section exists so a reviewer can see, at a glance, that the design was adversarially checked rather than just written once and assumed complete.

| Area | Gap found | Resolution |
|---|---|---|
| Process architecture | Bot described as "in-process" but folder structure implied a separate service | Merged into one process (Sections 2, 9) |
| Simulator | Tick interval and initial boot state were unspecified | Fixed at 5s; boot-time seeded 40–60% on (Section 4.2, 5.2) |
| Room lookup | Case/format sensitivity would break natural command input | Normalization + alias table (Section 4.1) |
| Alerts | No defined granularity — risk of one-alert-per-device flooding | Deduplicated per (type, room) (Section 4.4) |
| Alerts | No defined resolution condition | Explicit resolve triggers per alert type (Section 4.4) |
| Health check | `simulatorAlive` had no concrete definition | Defined via last-tick-timestamp threshold (Section 5.1) |
| Power accounting | Restart could silently zero today's usage | Persist device state and usage counters in local SQLite (Section 4.3) |
| Data integrity | Only the simulator writes state, but no invariant check existed | Added assertion on room/type/status/wattage validity (Section 4.2) |
| Time handling | DST transitions could skew 2-hour continuous-on math | Documented as accepted, out-of-scope limitation (Section 6) |
| Dashboard UX | Undefined behavior for animated devices during WS disconnect | Freeze at last-known state, don't reset to default (Section 6) |
| Device count | Spec self-contradicted (15 vs 18) | Resolved: 15 total, 5/room (Section 0 banner) |
| Rubric coverage | No explicit mapping from evaluation criteria to design sections | Added Section 0 coverage matrix |
| Hardware schematic | GPIO 2 double-assigned to Light 1 relay AND status LED — a real electrical conflict | Status LED moved to GPIO 27; strapping-pin caution added (Section 3.2) |
| Alert timing | Office-hours boundary (exactly 09:00:00 / 17:00:00) was ambiguous | Defined as inclusive-start, exclusive-end (Section 6) |
| Demo tooling | Debug alert-trigger hook was recommended in a note but never specified as a real endpoint | Formally added to API spec, gated behind `ENABLE_DEBUG_ROUTES` (Section 5.1) |
| Env var naming | Two drafts of the README used different names for the bot token (`DISCORD_BOT_TOKEN` vs `DISCORD_TOKEN`) | Canonicalized to `DISCORD_BOT_TOKEN` everywhere (Section 11, Assumption 12) |
| Debug-route gating | Spec'd as `NODE_ENV` **or** an "equivalent flag" — two possible implementations | Fixed to one explicit switch, `ENABLE_DEBUG_ROUTES` (Section 5.1, Assumption 13) |
| Doc duplication | Two READMEs and two near-identical architecture docs existed side by side | Consolidated to one README and this one `ARCHITECTURE.md` |

This is not a claim that every conceivable edge case is closed — it's a claim that every edge case identified through deliberate adversarial review has either been resolved with a concrete rule, or explicitly logged as an accepted limitation rather than left as silent undefined behavior. If another gap is found during implementation, the correct action is to add a row here and a rule above it — not to quietly pick something and move on.

---

This document is intended to be handed directly to implementation with no further architectural decisions required. Anything encountered during implementation that isn't covered above should be treated as a signal to add a line to Section 11 or 12, not to silently improvise. See `AGENTS.md` for the operating rules to follow while building against this spec, and `FRONTEND_BUILD_INSTRUCTIONS.md` for the dashboard-specific build contract.
