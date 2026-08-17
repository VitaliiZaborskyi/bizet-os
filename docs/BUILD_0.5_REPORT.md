# BIZET OS 1.0 — Build 0.5 Live Skeleton

## Goal
Add a non-photorealistic interactive visual skeleton that redraws from the existing Decision Engine output after every significant input change.

## Implemented
- Separate `app/static/visualizer.js`; it contains presentation logic only and no furniture decisions.
- Three views: Perspective (2.5D), Front, Plan.
- Room back wall, side walls by selected configuration, floor/depth envelope.
- Layout modules, tall units/appliances, fillers, obstacles and communication points.
- Width dimensions for each layout item and overall wall length.
- Live redraw on both `input` and `change`, debounced at 220 ms.
- Candidate switching redraws the same visualizer without mutating Decision Engine output.
- Explicit note that lower/tall visual display heights are schematic until OQ-03/OQ-04 are closed.
- Responsive UI and a compact visual legend.

## Rule separation
The visualizer consumes `LayoutCandidate`, `RoomResolved` and current `ProjectInput`. It does not calculate module placement, filler choice, candidate ranking or validation.

## Verification
- 32/32 pytest tests passed.
- `node --check` passed for `app.js` and `visualizer.js`.
- Python compileall passed.
- HTTP smoke test passed.
- `/api/health` reports `1.0.0-pilot.5`.
