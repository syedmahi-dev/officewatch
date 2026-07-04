# Documentation Package — OfficeWatch

This package contains the complete design documentation for OfficeWatch, built for the "Lights, Fans, Discord" hackathon challenge, ready to hand to whoever implements the backend/simulator, or to drop into the project repository.

## Contents

```
.
├── README.md                              Canonical project README — setup, env vars, API/command reference
├── AGENTS.md                              Operating rules for coding agents (anti-hallucination, scope guardrails)
├── .gitignore                              Standard + agentic-tool-artifact excludes
├── docs/
│   ├── ARCHITECTURE.md                    Full system design doc — the single source of truth for all behavior,
│   │                                        data shapes, API contracts, alert rules, and the edge-case audit
│   └── FRONTEND_BUILD_INSTRUCTIONS.md     Build contract for the web dashboard (no design decisions — functional
│                                            spec only: data contract, connection lifecycle, required panels,
│                                            edge cases, animation rules)
└── diagrams/
    ├── System_Architecture_Diagram.svg    High-level system diagram (vector)
    ├── System_Architecture_Diagram.md     Same diagram, markdown/box-drawing version
    ├── Circuit_Wiring_Diagram.svg         Hardware wiring reference, one room (vector)
    ├── Circuit_Wiring_Diagram.md          Same diagram, markdown/box-drawing version
    └── Component_List.md                  Bill of materials for the Wokwi/Tinkercad circuit
```

## Suggested use

1. Drop this whole package into your project repo root (merge `docs/` and `diagrams/` with your existing folders, or use as the starting structure).
2. Point whoever's implementing the backend at `AGENTS.md` first, then `docs/ARCHITECTURE.md` — that order matters, since `AGENTS.md` establishes how to treat the architecture doc (source of truth, no silent scope changes, no invented data).
3. Rebuild the actual interactive circuit in Wokwi using `diagrams/Circuit_Wiring_Diagram.svg`/`.md` and `diagrams/Component_List.md` as your reference — these are documentation artifacts, not exported simulator files.
4. Point whoever's building the dashboard at `docs/FRONTEND_BUILD_INSTRUCTIONS.md` — it only depends on `ARCHITECTURE.md` §4–§6, not on backend implementation details.

## Status

Both the architecture doc and the diagrams have been through two rounds of adversarial edge-case review (see `docs/ARCHITECTURE.md` §12 for the audit log). Device count is confirmed at 15 total (5 per room: 2 fans + 3 lights).

**Previously flagged inconsistencies — now resolved, not just noted:**
- The two draft READMEs disagreed on the Discord bot token env var name (`DISCORD_BOT_TOKEN` vs `DISCORD_TOKEN`). Canonical name is `DISCORD_BOT_TOKEN` — this is now the only name used anywhere in the package.
- The two draft READMEs disagreed on backend folder layout. Canonical layout is `backend/src/...`, matching `ARCHITECTURE.md` §9.
- The debug-route gating rule was previously "`NODE_ENV` or an equivalent flag" (an unmade implementation choice). It's now a single explicit rule: gated by `ENABLE_DEBUG_ROUTES=true` only, independent of `NODE_ENV` (`ARCHITECTURE.md` §5.1).
- The mains-voltage assumption (220V) is confirmed and logged as Assumption 3 in `ARCHITECTURE.md` §11 — no longer an open item.
- Two near-duplicate architecture documents existed; only `docs/ARCHITECTURE.md` remains and should be treated as canonical.

No open items remain before implementation begins.
