# Build 0.1 report

## Implemented

- Runnable FastAPI web application.
- Pure Python domain/Decision Engine separated from UI.
- Manual room dimensions in mm.
- Straight kitchen configurations: LEFT_WALL, RIGHT_WALL, BETWEEN_WALLS.
- Opening systems: HANDLE, PUSH, GOLA.
- Ceiling input enum ready for subsequent ceiling geometry rules.
- Filler rules: 18 mm end filler, 40 mm L/compensation filler, 22 mm wall-deviation Human Review threshold.
- Core appliance blocks: built-in/freestanding fridge, sink, dishwasher, cooktop, oven.
- Dishwasher adjacency to sink in pilot sequence.
- Pilot cutlery module 400 mm (explicit OQ-01 configuration, not hidden assumption).
- 50 mm module grid + allowed nonstandard hinged fallback.
- Ranking skeleton following validity/function/budget/space/symmetry intent.
- Compatibility/Human Review examples.
- Final length arithmetic and status system.
- Live SVG skeleton and rule trace.
- In-memory `NNN.MM.YY` application number prototype.

## Verified

- `pytest -q`: 8 passed.
- `/api/health`: OK.
- 3000 mm smoke case fills exactly 3000 mm.

## Intentionally deferred

- Scan ingestion.
- Production-accurate vertical 3D geometry (OQ-03/OQ-04).
- Full communication tap/focus UI.
- Full appliance catalog/model-specific geometry.
- Persistent DB/monthly transaction counter.
- Export/watermark.
- Photorealistic render, price, colors, production details.
