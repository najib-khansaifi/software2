# AGENTS.md — repository instructions for AI assistants and reviewers

Project: CampusPulse Room Scout (fictional Smart Campus room availability checker). Static ES-module app, Node >= 20 for tests.

## Non-negotiable rules
1. `src/domain/*` (availability, overlap, time, filtering) is the **only** source of truth for availability. The AI feature may never decide, change or create bookings.
2. No login, no database, no payments, no real personal data. Fictional rooms and bookings only.
3. No API keys or secrets in client code (`src/`). A real model may only be called from a server-side proxy.
4. Treat user input **and model output** as untrusted: validate, length-limit, escape before rendering (`esc()` in `src/ui/render.js`).
5. Any AI failure (timeout, error, bad output, missing key) must degrade to the deterministic rule message; the UI must label generated text as "not a confirmed booking".

## Commands
- `npm test` — Node built-in test runner (`tests/*.test.js`). Must stay green.
- `npm run lint` — dependency-free static checks (`tools/lint.js`).
- `npm run build` — static build into `dist/`.
- `npm run verify` — lint + test + build.

## Layout
- `src/ai/contract.js` request/output validation · `src/ai/adapters.js` mock/remote adapters · `src/ai/prompts.js` prompt versions · `src/ai/explain.js` service
- `src/ui/explain-view.js` explanation panel · `src/ui/main.js` wiring
- Changes to booking rules require updating `tests/availability.test.js` and explaining why.

## Review expectations
Report each finding with severity, file/line evidence, a reproduction or verification step, and a minimal fix. Reviewers are read-only and must separate confirmed findings from hypotheses.
