# CampusPulse Room Scout - Assignment 04

Published live demo: https://najib-khansaifi-soft-f20u.bolt.host

A fictional smart-campus room availability checker. The project extends a one-room baseline into a six-room catalog with capacity and equipment filtering while preserving the original time/overlap rules.

## Run locally

- Quick static preview: `python3 -m http.server 5173` then open `http://localhost:5173`
- With Node/Vite available: `npm install`, then `npm run dev`.

## Test

`npm test`

Verified final result: 59/59 tests passed.

## Build

`npm run build`

Verified build output: `dist/`.

## Final Bolt refinement

The published version adds a compact CP logo mark and a subtle selected-room pulse animation. Functional behavior, room data, filtering, booking rules and tests are unchanged. Motion is disabled for users who prefer reduced motion.

## Scope

Fictional data only. No login, database, payments, external API, or booking creation.

## Practice #11/#12: optional "Explain availability" (AI-enabled feature)

After a check, the **Explain availability** button shows a short (max 2 sentences) explanation of the result.
The deterministic rule engine stays the only authority; the explanation is labelled *"Generated explanation (not a confirmed booking)"*.
Default adapter is a clearly labelled **mock** (no key, no network). Any timeout, error, missing adapter or invalid output falls back to the standard rule message.

- Code: `src/ai/` (contract, adapters, prompts, service), `src/ui/explain-view.js`
- Rules for AI assistants/reviewers: `AGENTS.md`
- Commands: `npm run lint`, `npm test` (125 tests), `npm run build`, `npm run verify`
- Demo hooks for failure paths: `?ai=slow`, `?ai=fail`, `?ai=none`, and `?explain=1`
- Docs: `docs/` (feature contract, architecture, prompt comparison, review)
