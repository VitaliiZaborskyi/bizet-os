# BIZET OS 1.0 — Prototype Architecture

## Design decision

The first build is a **modular monolith** with a strict boundary between furniture logic and presentation.

```text
Browser UI
   ↓ JSON/HTTP
FastAPI boundary
   ↓
Domain models
   ↓
Decision Engine pipeline
   ├─ FillerEngine
   ├─ CompatibilityEngine
   ├─ ApplianceEngine
   ├─ ModuleEngine
   ├─ RankingEngine
   └─ FinalValidationEngine
   ↓
LayoutCandidate + RuleTrace + ValidationResult
   ↓
SVG presentation
```

## Why this stack now

The goal of build 0.1 is to validate horizontal layout logic, rule traceability, module splitting, fillers and compatibility. It intentionally avoids a frontend framework and 3D dependency so furniture rules can be tested immediately and independently. A future React/Three.js UI can consume the same API without changing the engine.

## Rule ownership

No BIZET furniture dimensions or decision rules may live in `app/static/`.

- Stable/pilot numeric values → `app/engine/constants.py`
- Furniture decisions → `app/engine/rules.py`
- Input/output contracts → `app/domain/models.py`
- UI → only gathers inputs and renders engine output

## Prototype pipeline

```text
ProjectInput
→ FillerEngine
→ CompatibilityEngine
→ ApplianceEngine
→ reserve required functional module(s)
→ ModuleEngine
→ place cooking block after residual work modules
→ RankingEngine
→ FinalValidationEngine
→ LayoutCandidate
```

## Rule traceability

Every significant automatic decision produces a `RuleTrace` with:

- `rule_id`
- classification
- human-readable message
- optional numeric/data payload

This is intentionally visible in debug mode to compare machine decisions with expert BIZET decisions during pilot testing.
