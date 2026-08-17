# BIZET OS 1.0 — Build 0.3 report

Implemented Appliance Engine + Compatibility Engine from specification v0.9.

## Added
- Typed engine outcomes: HARD_RULE, DEFAULT_RULE, RECOMMENDATION, AUTO_RESOLVED, USER_CHOICE_REQUIRED, WARNING, STOP, HUMAN_REVIEW.
- Appliance normalization endpoint: `POST /api/appliances/resolve`.
- Compatibility endpoint: `POST /api/compatibility/evaluate`.
- Compatibility results also included in `/api/generate` as `engine_results`.
- Built-in fridge ventilation/tall-unit metadata and GOLA/door-closer conflict.
- Freestanding fridge 40 mm filler / 50 mm overhead gap metadata.
- Tall oven lower functional section and power-zone policy.
- Built-in hood 350 mm upper carcass depth, confirmed ventilation requirement, Human Review for duct route.
- Dishwasher/sink adjacency hard rule.
- Required connection presence -> STOP.
- Gas cooktop path -> Human Review in v1.0.
- Sink mount type and waste-disposer usable-volume metadata.
- Generic power-zone policies from the approved BIZET rules.

## Deliberately not implemented
- Exact outlet-vs-appliance-envelope geometry: requires final placed appliance XYZ envelope / vertical system.
- Detailed material compatibility for sink mounts: materials/pricing layer is outside current prototype scope.
- Rare appliances beyond the specified pilot list.

## Verification
- 23 automated tests passed.
- Python compile check passed.
- JS syntax check passed (where Node is available).
- API smoke tests confirmed HUMAN_REVIEW vs STOP separation.
