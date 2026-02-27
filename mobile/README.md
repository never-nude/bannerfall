# Bannerfall Project Layout

This folder is organized so the active game files stay easy to find.

## Live Runtime Files (edit these for gameplay/UI)
- `index.html`
- `main.js`
- `style.css`
- `build.js`
- `assets/`

## Planning Docs
- `BANNERFALL_SOURCE_OF_TRUTH.md`
- `BANNERFALL_BUILD_PLAN.md`

## Archived Snapshots
- `_archive/`
  - Historical `main.js.bak*` snapshots kept for rollback/reference.

## Dev Tooling (not loaded by the game at runtime)
- `_dev/`
  - Scenario generator/patch helper scripts.
  - Script support assets and python cache files.

## Safe Workflow
1. Make gameplay and UI changes in `main.js`, `index.html`, or `style.css`.
2. Keep backup snapshots in `_archive/` only.
3. Treat `_dev/` scripts as tooling, not source-of-truth gameplay code.
4. After major edits, run a syntax check:
   - `node --check main.js`

## Notes
- The game is local-first and runs in-browser.
- `build.js` is a build/version stamp used for cache-busting.
