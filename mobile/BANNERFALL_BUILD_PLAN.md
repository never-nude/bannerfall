# Bannerfall Build Plan

## Goal
Turn the current prototype into a stable, legible, replay-ready tactical core without losing speed or clarity.

## Phase 1: Stabilize Existing Prototype (Immediate)
1. Naming normalization
- Replace visible legacy labels (`Warfare`, `Polemos`) with `Bannerfall`.
- Keep file names unchanged until behavior is stable.

2. Scenario integrity guardrails
- Enforce on-load validation:
  - unit hex must be active,
  - terrain hex must be active,
  - no duplicate unit placement.
- Surface warnings in log/HUD when invalid scenario entries are skipped.

3. Lightweight project hygiene
- Keep current working build files clear (`index.html`, `main.js`, `style.css`, `build.js`).
- Move backup snapshots/scripts into a `_dev` or `_archive` folder after confirmation.

## Phase 2: Formalize Game Engine Boundary
1. Create pure engine module (`engine.js` or similar)
- State in, action in -> state out (plus event list).
- No direct DOM access inside engine.

2. Define canonical action schema
- `select_unit`
- `move_unit`
- `attack_unit`
- `pass_activation`
- `end_turn`
- `load_scenario`

3. Deterministic randomness
- Seeded RNG path for combat resolution.
- Optional seed input in UI for reproducibility.

## Phase 3: State Serialization and Replay
1. Add state snapshot export/import (JSON)
- Export current full state.
- Import and restore exactly.

2. Add action log replay
- Store applied actions with turn/side metadata.
- Replay from initial scenario + action list.

3. Add milestone save format
- Single JSON package with:
  - version/build id,
  - scenario,
  - state,
  - action log.

## Phase 4: Scenario Authoring Quality
1. Scenario metadata
- Title, lesson intent, side notes, expected duration.

2. Scenario validator tooling
- CLI/script to validate all scenario files.
- Report out-of-bounds units/terrain, overlap, and unsupported fields.

3. Curated learning ladder
- Baseline set: Even Lines, Screen Pressure, Envelopment, Corridor, River Fords.

## Phase 5: AI/Multiplayer Readiness
1. AI (local)
- Implement legal-action generator + baseline heuristic policy.

2. Multiplayer (deferred)
- Use action protocol over authoritative engine state transitions.
- No sync logic until deterministic replay passes.

## Work Rules for This Project
1. One source of truth: `BANNERFALL_SOURCE_OF_TRUTH.md`.
2. Every gameplay change must identify:
- pillar affected,
- rule changed,
- replay impact.
3. No feature merges without:
- scenario integrity pass,
- deterministic sanity check.

## Suggested Next Task (Now)
Complete Phase 1.1 immediately: rename visible in-game text to `Bannerfall` and remove label drift in the HUD/title.
