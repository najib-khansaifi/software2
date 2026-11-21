# Project memory

## Product intent & audience

- CampusPulse Room Scout: room availability checker app for campus spaces.
- Static front-end app; no backend, no login, no database. Uses fictional/demo data only.

## Brand personality & voice

- Utility-focused campus tool; tone is practical and informative.

## Visual design & UX direction

- Vite-served SPA with build output to `dist/`.
- Core feature: room availability checking UI.
- Optional "Explain availability" feature framed as AI but implemented as mock/local (no network or API key required).
- Demo query-string hooks supported: `?ai=slow`, `?ai=fail`, `?explain=1`.

## Decisions, constraints & rationale

- Run and verify project as-is; do not rewrite or remove existing code unless explicitly requested.
- Verification baseline: 125/125 tests pass, lint clean, build successful.
- No backend dependencies; safe to run in a static/serverless preview environment.

## Open questions & assumptions

- Assuming "as-is" means preserve current implementation and dependencies without upgrades or refactors.
- Scope of future changes (features, styling, real AI integration) not yet specified.