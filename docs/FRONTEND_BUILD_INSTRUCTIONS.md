# Frontend Build Instructions — Office Power Monitoring Dashboard

This is a build brief, not a design. It states exactly what the dashboard must
do and the contract it must speak. The visual design is a separate, later
step and is intentionally left open here — see the "Design process" section
at the bottom for how to approach it when that step starts.

Source of truth for everything below: `ARCHITECTURE.md` §4–§6, §5.2. If this
document and `ARCHITECTURE.md` ever disagree, `ARCHITECTURE.md` wins — update
this file, don't silently follow it.

---

## 1. What this app talks to

The dashboard is a pure consumer of the shared backend. It never invents
state, never simulates data client-side, and never talks to Discord. One
WebSocket connection plus REST fallback is the entire data layer.

### REST endpoints (initial load / fallback poll only)
| Method | Path | Use |
|---|---|---|
| GET | `/api/status` | Initial full state on page load, before WS connects |
| GET | `/api/room/:roomId` | Not needed if `/api/status` already gives full state grouped by room — skip unless a per-room view is added later |
| GET | `/api/usage` | Fallback if WS drops and the poll fallback (see §8 below) kicks in |
| GET | `/api/alerts` | Same fallback case |
| GET | `/api/health` | Drives the "backend healthy" indicator |

### WebSocket — `/ws`
Connect once. Message shapes (exact, do not add fields):
```
{ type: "full-state",     payload: Device[] }
{ type: "state-update",   payload: Device[] }
{ type: "alert-new",      payload: Alert }
{ type: "alert-resolved", payload: { id: string } }
```

**Device**
```
{
  id: string,
  type: "fan" | "light",
  room: "drawing" | "work1" | "work2",
  status: "on" | "off",
  powerDrawWatts: number,
  lastChanged: ISO8601 string
}
```

**Alert**
```
{
  id: string,
  type: "after-hours" | "prolonged-on",
  room: string,
  message: string,
  triggeredAt: ISO8601 string,
  resolvedAt: ISO8601 string | null
}
```

The server sends `full-state` immediately on connect and `state-update` on
every 5-second tick regardless of whether anything changed — treat every
`state-update` as a full replace of device state, not a diff.

---

## 2. Connection lifecycle (non-negotiable, per §5.2)

1. On mount: connect to `/ws`.
2. On the first `full-state` message, render. Do not render from `/api/status`
   and then again from the WS message — pick one path to avoid a flash of
   possibly-stale data. Recommended: show a loading state until the first WS
   message arrives; only fall back to `/api/status` if the WS connection
   fails to open within a few seconds.
3. On disconnect: reconnect with exponential backoff — 1s, 2s, 4s, up to a
   10s cap. Do not reconnect instantly in a tight loop.
4. On reconnect: request `full-state` again (the server does not queue missed
   messages — this is a documented limitation, not a bug to work around).
5. **While disconnected:** any animated representation of device state
   (the bonus office-layout view, if built) must freeze at its last-known
   state, not reset to a default "all off" look. Resetting to a default
   would visually claim a state the frontend can no longer verify.
6. Surface connection state visibly somewhere in the UI at all times
   (e.g. connected / reconnecting / offline) — this is what `/api/health`
   and the WS `onclose`/`onopen` events are for.

---

## 3. Required screens / panels (minimum bar, from the spec)

These three are graded line items — all three must exist and update live,
with no manual refresh:

1. **Live Device Status Panel** — all devices, grouped by room, each clearly
   labeled (e.g. "Fan 1", "Light 3") with a visible on/off indicator.
2. **Live Power Consumption Meter** — total office wattage, plus a per-room
   breakdown, updating alongside the device panel. Also show today's
   estimated kWh (`/api/usage`'s `todayEstimatedKwh`).
3. **Active Alerts Panel** — every active alert, timestamped
   (`triggeredAt`), with the room and a human-readable message. When an
   `alert-resolved` message arrives for an alert's `id`, remove it from the
   active list (or move it to a "recently resolved" section if you want
   that nuance — not required).

Optional bonus, build only if time allows: a top-down office layout view
where lights visually indicate "on" and fans visually indicate "running."
This does not replace the three panels above — it's additive.

---

## 4. States the UI must not get wrong

- **Empty/loading state before first data arrives** — never render a bare
  blank screen; show that data is loading, not that the office has 0 devices.
- **Unknown/malformed device from the server** — the frontend should not
  crash on an unexpected `type`, `room`, or `status` value; render it in an
  "unrecognized device" fallback state and log it, rather than throwing.
  Validation of the actual device data is the backend's job (per
  `ARCHITECTURE.md` §4.2's writer-function invariants) — this is just
  defensive rendering, not re-implementing that validation.
- **All devices in a room off** — show "all off," not an empty room card.
- **Two alerts active for the same room** (`after-hours` and `prolonged-on`
  simultaneously) — this is expected per §4.4, not a bug; both must be
  visible, not deduplicated further on the frontend.
- **WS never connects at all** (backend down) — fall back to polling
  `/api/status`, `/api/usage`, `/api/alerts` on a slow interval (e.g. 15–30s)
  and show a persistent "live updates unavailable" banner, rather than
  failing silently.

---

## 5. Room display names

Canonical room IDs from the backend are `drawing`, `work1`, `work2` — the
frontend receives these exact strings and only needs a **display label**
mapping for presentation (e.g. `work1` → "Work Room 1"). Do not reimplement
the alias/normalization table from `ARCHITECTURE.md` §4.1 on the frontend —
that table exists for parsing *natural-language input* (Discord commands),
which the dashboard has no equivalent of. A simple one-way lookup for
display purposes is all that's needed here:

```
drawing → "Drawing Room"
work1   → "Work Room 1"
work2   → "Work Room 2"
```

---

## 6. Animation — use GSAP, keep it purposeful

GSAP is approved for:
- A fan icon/element rotating continuously while `status === "on"`, stopped
  (not reset mid-rotation, just stopped) when `status === "off"`.
- A light element's glow/opacity animating up when it turns on and down when
  it turns off — the transition itself should be quick (a state *change*,
  not an ambient loop), while "on" can hold a subtle steady glow.
  - An alert entering the Active Alerts Panel animating in distinctly from
  alerts already present (e.g. slide/fade), and animating out on
  `alert-resolved` rather than disappearing instantly.
- The power meter's numeric readout tweening from its old value to its new
  value on each `state-update` rather than snapping, so a jump is legible as
  a change rather than a flicker.

Requirements regardless of what's animated:
- Respect `prefers-reduced-motion`: anything continuous (fan rotation,
  ambient glow) must have a reduced/near-static fallback; one-shot
  transitions (alert entering/leaving) can stay but should shorten.
  significantly.
- No animation should block or delay the actual data update — the DOM/state
  update to the true value happens immediately; GSAP only animates the
  *visual transition* toward it.
- Don't animate things that aren't communicating a state change. Motion here
  should always mean "this changed" or "this is currently running" — not
  decoration.

---

## 7. What NOT to build into the frontend

- No device control (toggling a light/fan from the dashboard) — the spec is
  read-only monitoring. Don't add a control that has nowhere to write to.
- No authentication — matches the documented, deliberate scope limitation.
- No client-side alert logic — alerts are computed entirely by the backend's
  Alert Engine; the frontend only ever displays what it's told, and should
  not attempt to re-derive "after-hours" or "prolonged-on" conditions itself
  even for a nicer-looking countdown, since that would let the two
  interfaces (dashboard vs. Discord bot) disagree.
- No polling as the primary transport — WebSocket is primary; REST polling
  is fallback-only (§4 above).

---

## 8. Handoff checklist before calling this "done"

- [ ] Connects to `/ws`, renders on `full-state`, updates on every
      `state-update`.
- [ ] Reconnects with the exact backoff schedule in §2, re-requests
      `full-state` on reconnect.
- [ ] All three required panels present and updating without a page refresh.
- [ ] Handles a fully-off room, a room with two simultaneous alert types, and
      a WS disconnect, without visual glitches or crashes.
- [ ] No hardcoded device/room counts anywhere in the frontend code — the
      panel renders whatever the backend sends, however many devices that is.
- [ ] Connection status is visible to the user at all times.
- [ ] Reduced-motion users get a non-distracting, still-informative version
      of every animated state.

---

## Design process (separate step, not covered by this document)

When visual design work starts, treat it as its own pass: a short design
brief (palette, typography, layout, one signature moment), reviewed for
whether it's a genuine choice for *this* subject rather than a generic
dashboard template, before any component is styled. That review and the
actual visual decisions are deliberately not made here — this document is
the functional contract only.
