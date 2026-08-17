# BIZET OS 1.0 — Build 0.4 Module Engine

## Scope
Build 0.4 implements the residual-space Module Engine and strict candidate ranking without expanding BIZET OS 1.0 scope.

## Implemented
- Required functional module pass before residual split.
- Pilot cutlery-tray reservation remains 400 mm and is explicitly traced as OQ-01 pilot value.
- Standard digital width grid: 50 mm.
- Exact standard-grid candidate generation (multiple candidates where geometry permits).
- Nonstandard width fallback is allowed, not treated as an error.
- Nonstandard residual modules carry `accessory_compatibility_required=true`.
- Budget default generates simple hinged residual modules; no optional drawers/cargo are invented.
- Fillers remain deducted before module distribution by the existing Filler Engine.
- Several layout candidates are produced when the exact residual admits several solutions.
- Ranking is strict lexicographic:
  1. VALIDITY
  2. FUNCTION
  3. BUDGET
  4. EFFICIENT_SPACE
  5. SYMMETRY
- Scalar `score` is debug/display only; it is not used for candidate ordering.
- UI shows candidate pills and ranking vector so pilot testers can compare alternatives.

## Deliberately not invented
- No maximum cabinet width rule was added: the specification does not define it yet.
- No preferred width beyond the 50 mm grid was promoted to a furniture hard rule.
- No exact accessory library was invented for cutlery trays, cargo, bins, etc.
- No pricing model was used to distinguish two hinged-only candidates.

## Verification
- Full automated suite: 29 tests passed.
- New Module Engine tests cover:
  - multiple 50-mm-grid candidates;
  - off-grid nonstandard fallback;
  - required cutlery function before residual distribution;
  - hinged budget default;
  - true lexicographic ranking precedence.
