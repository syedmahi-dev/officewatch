# OfficeWatch Backend Todo

## Plan

- Add a dedicated demo simulation controller with stable presets, clock override, and simulator pause/resume.
- Expose the controller through gated debug routes and document the demo workflow.
- Verify the new demo controls with backend integration tests.

## Progress

- Done: demo simulation controller implementation.
- Done: docs and README updates for demo controls.
- Done: backend verification for the new debug routes.

## Verification Notes

- Passed: `npm test` in `backend/` (run outside sandbox because integration tests bind local ports)

---

# OfficeWatch Dashboard Beautification Todo

## Plan

- Preserve the current live-dashboard structure while upgrading the visual language with a calmer control-room feel.
- Refine the global theme shell, metadata, and header summary so the dashboard feels intentional before touching individual panels.
- Restyle the power, alerts, and device-status panels as one cohesive system, then verify with a production build and lint pass.

## Progress

- Done: Graphify map of the dashboard render path and panel ownership.
- Done: shell and panel redesign using the existing Tailwind, Motion, and GSAP stack.
- Done: metadata refresh for the dashboard entry document.
- Done: removed non-essential helper copy so the dashboard shows only operational information.

## Verification Notes

- Passed: pre-change `npm run build` in `dashboard/`
- Passed: post-change `npm run build` in `dashboard/`
- Passed: `npm run lint` in `dashboard/`

---

# OfficeWatch SQLite Persistence Todo

## Plan

- Add a minimal SQLite adapter using Node's built-in `node:sqlite` module.
- Hydrate and persist the backend device store without changing the existing REST, WS, or Discord-facing store API.
- Verify persistence behavior with isolated backend tests and update docs/env defaults.

## Progress

- Done: SQLite adapter and store integration.
- Done: backend tests updated to use isolated in-memory SQLite where needed.
- Done: README, architecture, and env docs updated for the new persistence path and Node 22 requirement.

## Verification Notes

- Passed: `npm test` in `backend/` (run outside sandbox because API tests bind a local port)

---

# OfficeWatch Discord Restart Todo

## Plan

- Remove the deprecated Discord startup event hook so runtime logs stay clean.
- Restart the backend on the intended local port and confirm Discord auth plus API startup together.
- Update the project docs with the verified startup behavior and the port-conflict recovery note.

## Progress

- Done: switched the Discord startup listener to `clientReady` to remove the deprecation warning.
- Done: documented successful Discord startup and local port-conflict recovery in the project docs.
- Done: cleared port `3000` and restarted the backend cleanly.

## Verification Notes

- Passed: live backend restart on `127.0.0.1:3000`
- Passed: backend log showed `OfficeWatch backend listening on port 3000`
- Passed: backend log showed `Discord bot ready as OfficeWatch#8988`
- Passed: `GET /api/health` returned `status: ok` with `simulatorAlive: true`
- Passed: `GET /api/status` returned `3` rooms and `15` devices

---

# OfficeWatch Discord Mention Todo

## Plan

- Make the Discord bot respond to direct `@OfficeWatch` mention-style questions in addition to existing bang commands.
- Add focused tests for the new message routing behavior and update the documented Discord contract.
- Restart the backend so the live bot uses the new router immediately.

## Progress

- Done: mention-aware Discord routing implementation for status, room, and usage prompts.
- Done: focused Discord router tests plus full backend verification.
- Done: live backend restart so the updated bot behavior is active on Discord.

## Verification Notes

- Passed: `node --test test/discordMessageRouter.test.js` in `backend/`
- Passed: `npm test` in `backend/` (run outside sandbox because API tests bind a local port)
- Passed: live backend restart on `127.0.0.1:3000`
- Passed: backend log showed `OfficeWatch backend listening on port 3000`
- Passed: backend log showed `Discord bot ready as OfficeWatch#8988`
- Passed: `GET /api/health` returned `status: ok` with `simulatorAlive: true`

---

# OfficeWatch Discord Phase 1-3 Todo

## Plan

- Upgrade the Discord formatter so status, room, usage, and alert replies feel more human while staying deterministic.
- Expand the mention router and fallback behavior so room-specific prompts get focused answers and unclear prompts get helpful guidance.
- Verify with focused formatter/router tests, full backend tests, and a live restart.

## Progress

- Done: formatter and routing upgrade for the Phase 1-3 bot behavior pass.
- Done: focused formatter/router tests and full backend verification.
- Done: live backend restart so the upgraded Discord behavior is active.

## Verification Notes

- Passed: `node --test test/discordMessageRouter.test.js test/responseFormatter.test.js` in `backend/`
- Passed: `npm test` in `backend/` (run outside sandbox because API tests bind a local port)
- Passed: live backend restart on `127.0.0.1:3000`
- Passed: backend log showed `Discord bot ready as OfficeWatch#8988`
- Passed: backend log showed `OfficeWatch backend listening on port 3000`
- Passed: `GET /api/health` returned `status: ok` with `simulatorAlive: true`
- Passed: `GET /api/status` returned `3` rooms and `15` devices
