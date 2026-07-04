# System Architecture Diagram — OfficeWatch

Manually drawn (no Mermaid, per spec requirement). Color-coded by data-flow type using the legend below — same color mapping as `System_Architecture_Diagram.svg`, so both versions stay in sync.

## Color Legend

| Swatch | Meaning |
|:---:|---|
| 🔵 | Internal state write/read (Device Store, single writer function) |
| 🟡 | Alert Engine — trigger / evaluation / dedup logic |
| 🟢 | Live WebSocket push to the Web Dashboard |
| ⚪ | REST — on-demand request or fallback poll |
| 🟣 | Discord Gateway / Bot traffic |

---

## Part 1 — Inside the Backend (single Node.js process)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                 BACKEND — ONE Node.js PROCESS                             ║
║        (Express + ws + discord.js, all started from server.js)           ║
║                                                                             ║
║   ┌─────────────────────┐   🔵   ┌─────────────────────┐                  ║
║   │   SIMULATOR          │──────▶│   DEVICE STORE        │                  ║
║   │  • 5s tick interval  │       │  • in-memory          │                  ║
║   │  • boot-seeded       │       │  • 15 devices total   │                  ║
║   │    40–60% ON         │       │  • 5/room (2 fan+3lt) │                  ║
║   │  • mutates status /  │       │  • ONE writer fn      │                  ║
║   │    power / lastChg   │       │  • validates enums    │                  ║
║   └─────────────────────┘       └──────────┬────────────┘                  ║
║                                             │ 🔵                            ║
║                     ┌───────────────────────┼───────────────────────┐      ║
║                     ▼ 🔵                     ▼ 🔵                     ▼ 🔵    ║
║   ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
║   │  🟡 ALERT ENGINE      │   │  ⚪ REST API          │   │  🟢 WS HUB            │
║   │  • after-hours       │   │  GET /status         │   │  full-state          │
║   │  • prolonged-on >2h  │   │  GET /room/:id       │   │  state-update        │
║   │  • dedup (type,room) │   │  GET /usage          │   │  alert-new           │
║   │  • resolve triggers  │   │  GET /alerts         │   │  alert-resolved      │
║   │                      │   │  GET /health         │   │  (5s tick broadcast) │
║   │                      │   │  POST /debug/        │   │                      │
║   │                      │   │   force-alert (gated │   │                      │
║   │                      │   │   by ENABLE_DEBUG_    │   │                      │
║   │                      │   │   ROUTES)             │   │                      │
║   └──────────┬───────────┘   └──────────┬──────────┘   └──────────┬──────────┘
║              │ 🟡                        │ ⚪                       │ 🟢       ║
║              └────────────────┬──────────┘                        │          ║
║                                ▼ 🟡🟣                               │          ║
║              ┌──────────────────────────────────────┐              │          ║
║              │  🟣 DISCORD BOT CLIENT (discord.js)   │              │          ║
║              │  !status   !room <name>   !usage      │              │          ║
║              │  reads Device Store via IN-PROCESS    │              │          ║
║              │  function call — NOT a network hop    │              │          ║
║              │  rate-limited proactive alert push    │              │          ║
║              │  (30 min cooldown per type+room)      │              │          ║
║              │  try/catch every handler — never      │              │          ║
║              │  exposes raw JSON to the user          │              │          ║
║              └──────────────────┬───────────────────┘              │          ║
╚═════════════════════════════════╪══════════════════════════════════╪══════════╝
                                   │ 🟣                                │ 🟢 / ⚪
                                   ▼                                   ▼
```

---

## Part 2 — Backend to Interfaces to End Users

```
   🟣 Discord Gateway API                          🟢 WebSocket (live)  /  ⚪ REST (fallback)
              │                                                    │
              ▼                                                    ▼
   ┌─────────────────────────┐                    ┌─────────────────────────────┐
   │  🟣 DISCORD SERVER        │                    │  🟢 WEB DASHBOARD              │
   │  • bot answers commands  │                    │  • live device status panel   │
   │    from live data        │                    │  • power meter (total+room)   │
   │  • proactive alert post  │                    │  • active alerts panel        │
   │    to designated channel │                    │  • office layout view (bonus) │
   │  • humanized replies     │                    │  • reconnect-with-backoff     │
   └────────────┬─────────────┘                    └──────────────┬─────────────┘
                │                                                  │
                ▼                                                  ▼
   ┌─────────────────────────┐                    ┌─────────────────────────────┐
   │   Boss on Discord         │                    │   Boss / Staff (Browser)      │
   │   quick remote-control    │                    │   full live picture, no      │
   │   check, no browser       │                    │   manual refresh needed       │
   │   needed                  │                    │                                │
   └─────────────────────────┘                    └─────────────────────────────┘
```

---

## Flow Narrative (for the video demo script)

1. 🔵 **Simulator → Device Store**: every 5 seconds, the simulator mutates a device's `status`, `powerDrawWatts`, and `lastChanged` inside the single in-memory Device Store, through the one writer function that validates the write.
2. 🔵 **Device Store → Alert Engine / REST / WS Hub**: every mutation is immediately visible to all three internal consumers — no queue, no delay, since it's all one process reading one object.
3. 🟡 **Alert Engine**: recomputes `after-hours` and `prolonged-on` conditions every tick, deduplicated per `(type, room)`, and emits `alert-new` / `alert-resolved` events.
4. 🟢 **WS Hub → Web Dashboard**: pushes `full-state` on connect and `state-update` + `alert-new` on every tick — the dashboard never polls.
5. 🟣 **Discord Bot Client**: reads the *same* Device Store via a direct in-process function call (not a network hop) when a command runs, and independently receives alert events to push proactively to a designated channel — guaranteeing the bot and dashboard can never disagree about the current state.
6. ⚪ **REST API**: used for the dashboard's initial page load and as a fallback poll if the WebSocket connection drops, plus a gated dev-only endpoint (`/api/debug/force-alert`, gated by `ENABLE_DEBUG_ROUTES=true`) to manufacture a real alert on demand for demo recording.

---

*Companion files: `System_Architecture_Diagram.svg` (same diagram, vector graphic) and `Component_List.md` / `Circuit_Wiring_Diagram.md` for the hardware side.*
