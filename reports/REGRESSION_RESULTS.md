# BIZET OS 1.0 regression — 1.0.0-pilot.6

| Case | Expected | Actual | Result | Main notes |
|---|---|---|---|---|
| K01_valid_grid.json | VALID | VALID | PASS |  |
| K02_nonstandard_warning.json | VALID_WITH_WARNINGS | VALID_WITH_WARNINGS | PASS | Nonstandard residual module: accessory compatibility required before detailed design |
| K03_wall_deviation_review.json | HUMAN_REVIEW | HUMAN_REVIEW | PASS | LEFT: wall deviation 30 mm exceeds 22 mm |
| K04_gola_fridge_closer_review.json | HUMAN_REVIEW | HUMAN_REVIEW | PASS | Built-in fridge with door closers + horizontal GOLA requires specialist review; vertical GOLA is preferred fallback |
| K05_missing_cooktop_power_stop.json | STOP | STOP | PASS | Missing confirmed COOKTOP_POWER for COOKTOP |
| K06_gas_review.json | HUMAN_REVIEW | HUMAN_REVIEW | PASS | Gas pipe routing that can affect furniture geometry requires specialist review in v1.0 |
| K07_between_walls_handle.json | VALID | VALID | PASS |  |
| K08_builtin_hood_review.json | HUMAN_REVIEW | HUMAN_REVIEW | PASS | Built-in hood ventilation route must be checked by a specialist in v1.0 |

Passed: 8/8