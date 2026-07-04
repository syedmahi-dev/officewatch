# AGENTS.md — Operating Rules for Coding Agents

This file governs any AI coding agent working in this repository. It exists because agents left unconstrained tend to invent plausible-sounding details instead of admitting uncertainty. Every rule below closes a specific hallucination failure mode observed in agentic coding.

---

## 1. Source of truth hierarchy

When in doubt, resolve conflicts in this exact order:
1. `docs/ARCHITECTURE.md` (the design doc) — authoritative for behavior, data shapes, API contracts, alert rules.
2. `config/officeLayout.js` (or equivalent constants file) — authoritative for device counts, room names, wattage values.
3. This file — authoritative for how the agent behaves while working.
4. Nothing else. Not training data, not "common patterns," not what a similar project "usually" does.

If a task requires information not present in any of the above, **stop and ask** rather than inferring. Do not silently pick a default and proceed.

---

## 2. Known open issue — resolved, do not reopen

The source problem statement contains a genuine self-contradiction: the "Office Setup" section states 15 total devices (5/room), while other sections and the office layout image state 18 (implying 6/room). **This has been resolved by explicit user confirmation: the device count is 15 total, 5 per room (2 fans + 3 lights).** `docs/ARCHITECTURE.md` §0 and §4.1 reflect this.

**Rule:** Do not reintroduce 18, 6-per-room, or any related figure anywhere in the codebase — not in seed data, not in test fixtures, not in comments describing "typical" values. The only place a device count exists is `config/officeLayout.js`. If you encounter "18" anywhere in reference material (e.g., the original PDF spec or an old doc draft), treat it as superseded, not as a second valid option to reconcile.

---

## 3. No invented data

- The **only** approved sample/dummy human data (names, emails, phone numbers) for any test fixture, seed script, or example payload is:
  ```json
  [
    { "name": "Nafisa Rahman", "email": "nafisa.rahman@yahoo.com", "phone": "+8801812345678" },
    { "name": "Tanvir Hossain", "email": "tanvir.hossain@yahoo.com", "phone": "+8801912345678" }
  ]
  ```
  Never generate additional names, emails, or phone numbers, even for "more realistic" test coverage. If more sample records are needed, ask — do not invent them.
- Device wattages are fixed constants (fan = 60W, light = 15W per the spec) — never randomize these per-device; only `status` and `lastChanged` are dynamic.
- Never invent API endpoints, WebSocket message types, or Discord commands beyond what `docs/ARCHITECTURE.md` specifies. If a feature seems useful but isn't in the doc, propose it — don't build it silently.

---

## 4. No silent scope expansion

- Do not add authentication, databases, message queues, cloud deployment configs, or additional services unless explicitly requested. Section 8 of the architecture doc documents these as intentional exclusions for hackathon scope, not oversights.
- Do not swap the agreed stack (Node.js backend, single process, in-memory store) for a different language/framework/database because it seems "more robust" — that trade-off was already made deliberately and is documented.
- **The Discord bot runs inside the same Node process as the REST/WebSocket server — not a separate service.** Do not scaffold it as a standalone deployable (its own `package.json`, its own start script run separately) even if that feels like cleaner separation. The whole point is that both interfaces read the exact same in-memory object with zero network hop between them (see `ARCHITECTURE.md` §2, §9). If you find yourself writing an HTTP client inside the bot code to talk to "the backend," stop — that's a sign the process boundary was drawn wrong.

---

## 5. Hardware / schematic boundaries

- Never generate or export a complete Wokwi/Tinkercad project file, `.json` simulator export, or auto-generated schematic. Provide pin-mapping tables, wiring descriptions, and electrical reasoning only (see `ARCHITECTURE.md` §3) — the human builds the actual schematic in the tool.
- Do not invent GPIO pin numbers different from the pin mapping table in the architecture doc without flagging the change and the reason (e.g., a genuine ESP32 pin conflict you've identified).

---

## 6. When requirements are ambiguous

Before implementing any non-trivial feature, state explicitly:
- **Assumptions** you're making
- **Implementation plan** (brief)
- **Trade-offs** of that approach vs. alternatives
- **Validation approach** (how you or the user will confirm it works)

If there are two or more reasonable ways to implement something and the architecture doc doesn't disambiguate, ask a concise clarifying question instead of guessing. This applies especially to: alert thresholds, timezone handling, WebSocket payload shape, error message wording, and environment-variable naming/gating rules (e.g. the debug-route flag in `ARCHITECTURE.md` §5.1 — that rule is now fixed to a single explicit `ENABLE_DEBUG_ROUTES` flag; do not reintroduce a `NODE_ENV`-based alternative alongside it).

---

## 7. Error handling is not optional

Every route handler, WebSocket handler, and Discord command handler must:
- Validate input against known-good values (room IDs, device IDs) before using them in a lookup.
- Wrap in try/catch; never let an unhandled exception crash the process or the bot's gateway connection.
- Return/reply with a clear, human-readable message on failure — never a raw stack trace or raw JSON error to an end user (Discord) and never a silent 500 with no body on the API.

If you find yourself unsure whether an input needs validation, validate it. Do not assume inputs will always be well-formed because "it's just a demo."

---

## 8. Commit hygiene

- Commit messages should describe *what changed and why*, referencing the relevant architecture doc section when applicable (e.g., `feat: implement alert engine per ARCHITECTURE.md §6`).
- Do not bundle unrelated changes (e.g., a dashboard style tweak and a backend route fix) into one commit.
- Do not commit secrets, API keys, or Discord bot tokens — use environment variables and confirm `.env` is gitignored before any commit that touches config.
- Do not maintain two versions of the same document (e.g. two READMEs, two architecture docs) in parallel — if a doc needs revising, edit it in place rather than adding a second draft alongside it.

---

## 9. Self-check before declaring a task done

Before saying a feature is complete, confirm:
- [ ] It matches the exact contract in `docs/ARCHITECTURE.md` (endpoint paths, message shapes, alert rules, env var names) — not a close approximation.
- [ ] It handles the edge cases explicitly listed in the relevant section (e.g., Section 6's boundary cases for alerts).
- [ ] It doesn't reintroduce the 15-vs-18 device count question — device counts come only from the shared constants file.
- [ ] No hardcoded values duplicate what should come from `config/officeLayout.js`.
- [ ] Any env var it reads matches the name declared in `README.md` exactly — no silent renames.

If any box can't be checked with confidence, say so explicitly rather than marking the task complete.

---

## 10. Agent-generated artifacts do not belong in version control

Any files, caches, logs, session state, or scratch directories created by a coding agent itself (as opposed to the project's actual source code) must never be committed. See `.gitignore` — if a tool creates a directory or file not already covered there, add it before committing, don't rely on manually remembering to exclude it each time.
