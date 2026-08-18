# BUILD 1.1-A — AS IS → TO BE

## AS IS (BIZET OS 1.0 pilot)
- FastAPI modular monolith with thin API routes.
- `ProjectInput` is request-oriented and is recreated per `/api/generate` call.
- Rule/business logic is already separated from UI: Room, Appliance, Compatibility, Module, Ranking and FinalValidation engines.
- Client and engine terminology are partly mixed (`application_no`, STOP/Human Review exposed in response/debug UI).
- No canonical persistent/versioned project state and no dependency graph.
- Existing 37-test regression suite covers core pilot behavior.

## TO BE in Build 1.1-A
- Add canonical versioned `ProjectState` without rewriting furniture engines.
- Add provenance/source metadata as domain data.
- Add explicit dependency registry + mutation service.
- Add serialization and migration interface.
- Add `order_no` while keeping a compatibility alias to legacy `application_no`.
- Add ProjectState → legacy `ProjectInput` adapter.
- Add `/api/v1.1/projects` foundation endpoints with in-memory repository.
- Add EngineResult → client-message mapping boundary.

## Deliberately deferred
Adaptive Quest, new start UX, Three.js/3D, materials UI, manufacturing, pricing, accounts/cloud, scan providers, templates.
