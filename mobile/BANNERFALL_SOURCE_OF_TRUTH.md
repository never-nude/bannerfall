# Bannerfall Source of Truth

## Canonical Name
- Product name: `Bannerfall`
- Short definition: A readable, scenario-driven hex tactics game about cohesion vs collapse in ancient-style warfare.

## One-Sentence Vision
Bannerfall is a fast, legible digital tabletop where command cohesion, terrain geometry, and retreat pressure matter more than raw damage math.

## Core Design Pillars (Non-Negotiable)
1. Readability first: the board is primary; UI is an instrument panel.
2. Cohesion over damage optimization: command and positioning are the game.
3. Geometry as force: movement lanes, flanks, and retreats decide outcomes.
4. Deterministic trust: outcomes are explainable, state is inspectable, build/version is visible.
5. Play-at-home stability: local-first, no required backend for core gameplay.

## Battlefield Model
- Single hex battlefield shaped as a broad "fat diamond" (current default: 157 active hexes).
- No unit stacking.
- Terrain is mechanical, not cosmetic:
  - `water`: impassable boundary/no-go.
  - `woods`: friction and defensive effect.
  - `hills`: control geometry/value points.
  - `rough`: movement friction.
  - `clear`: baseline.

## Unit Archetypes
- `INF`: line anchor (anvil).
- `CAV`: angle/changing force (flank and shock geometry).
- `SKR`: screening/disruption and disengage role.
- `ARC`: ranged pressure, fragile if caught.
- `GEN`: command node, high strategic value, low direct lethality.

## Tempo and Command
- Limited activations per turn (baseline: 3).
- Units normally act once per turn.
- Command is spatial, based on general influence radius.
- Units out of command are constrained by quality/type rules.
- Design intent: player should feel local command friction every turn.

## Combat Philosophy
- Keep arithmetic sparse.
- Two key consequences:
  - Damage (HP loss).
  - Displacement (retreat).
- Retreat is geometry-changing and can cascade into collapse.
- Blocked retreat converts to damage.
- Resolution must remain consistent and explainable.

## Scenario Philosophy
Scenarios are tactical lessons, not random setups:
- Even lines: baseline cohesion/engagement physics.
- Screens: tempo and disruption.
- Envelopment: angle superiority.
- Corridors: congestion and sequencing.
- River/terrain crossings: initiative vs constraint.

## UI Philosophy
- Board remains large and legible.
- Sidebar/HUD acts as cockpit:
  - mode clarity,
  - state clarity,
  - action log,
  - scenario controls.
- Explicit modes (`Edit` vs `Play`) to avoid ambiguity.

## Future Architecture Direction
Before AI or multiplayer, formalize one authoritative engine that can:
1. Enumerate legal actions.
2. Apply action -> next state.
3. Resolve randomness deterministically (seeded).
4. Serialize/restore state exactly.

If this exists:
- AI = action policy.
- Multiplayer = action exchange protocol.
- Replay/debug = deterministic action log playback.

## Naming and Scope Freeze
- Use `Bannerfall` in docs/plans/feature language going forward.
- Legacy labels (Warfare/Polemos/etc.) are treated as historical artifacts to be migrated.
