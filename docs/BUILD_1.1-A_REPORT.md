# BIZET OS 1.1 — BUILD 1.1-A FOUNDATION / PROJECT STATE

## Status
**READY FOR OWNER REVIEW / FREEZE CANDIDATE**

Build 1.1-A implements only the foundation layer required by the Master Architecture. Adaptive Quest, new 3D/UI, materials, manufacturing, pricing, persistence accounts and external integrations are deliberately not implemented.

## A. What changed
- Added canonical, versioned `ProjectState` for OS 1.1.
- Added first-class provenance/source/confidence metadata.
- Added explicit dependency registry and downstream invalidation model.
- Added `ProjectMutationService`; project changes now produce affected/recalculation/reconfirmation sets and trace records.
- Added ProjectState serialization/import and migration interface.
- Added ProjectState → legacy BIZET OS 1.0 `ProjectInput` adapter.
- Added `order_no` terminology while keeping legacy `application_no` compatibility.
- Added engine-result → client-message boundary placeholder.
- Added in-memory project repository and `/api/v1.1/projects` endpoints.
- Preserved all existing BIZET OS 1.0 engine behavior and legacy API endpoints.

## B. New files
- `app/project/models.py`
- `app/project/dependencies.py`
- `app/project/mutations.py`
- `app/project/serialization.py`
- `app/project/versioning.py`
- `app/project/legacy_adapter.py`
- `app/project/messages.py`
- `app/project/repository.py`
- `app/api/routes_v11.py`
- `tests/test_project_state_v11a.py`
- `docs/BUILD_1.1-A_AS_IS_TO_BE.md`
- `docs/BUILD_1.1-A_REPORT.md`

## C. Existing files changed
- `app/main.py` — registers v1.1 foundation API while keeping legacy routes.
- `app/domain/enums.py` — adds `SYSTEM_CALCULATED` and `IMPORTED` provenance sources without removing legacy values.
- `app/engine/application_no.py` — adds `next_order_no()` terminology alias; legacy function remains.

## D. ProjectState schema
Top-level domains:
- `identity`
- `context`
- `room`
- `communications`
- `appliances`
- `furniture`
- `materials`
- `preferences`
- `pricing`
- `scene`
- `quest`
- `validation`
- `trace`
- `dependencies`

`identity` carries `internal_id`, `order_no`, `project_format_version`, `rule_set_version`, timestamps.

Critical measured room values use `MeasuredValue(value_mm, provenance)` with `source`, `confidence`, `confirmed`.

Future-layer structures exist as data slots only; their user-facing engines are not implemented.

## E. Dependency model
`DependencyEngine` is an explicit extendable registry. Build 1.1-A registers only a small set of known dependencies:
- room wall length/configuration → layout/selection/validation (+ price stale placeholder)
- communications → layout/validation
- appliances → layout/selection/validation (+ price stale placeholder)
- materials → validation (+ price stale placeholder)

Changing `room.geometry.wall_length`:
- marks layout candidates stale,
- clears stale selected candidate,
- schedules layout/validation recalculation,
- requires candidate reconfirmation,
- preserves independent appliance/material/category/visual choices.

This is infrastructure, not a claim that the full furniture dependency graph is complete.

## F. API contract
Legacy API remains under `/api/*`.

New foundation API:
- `POST /api/v1.1/projects`
- `GET /api/v1.1/projects/{id}`
- `PATCH /api/v1.1/projects/{id}`
- `POST /api/v1.1/projects/{id}/recalculate`
- `GET /api/v1.1/projects/{id}/state`

Persistence is intentionally in-memory for this Build.

## G. Versioning / migration contract
- `PROJECT_FORMAT_VERSION = 1.1.0`
- Rule-set version is imported from the existing 1.0 engine constant; it is not duplicated.
- `migrate(project, from_version, to_version)` exists.
- One explicit mock migration path `1.1.0-alpha → 1.1.0` is tested.
- Unknown migration paths fail rather than guessing.

## H. Tests
- Total automated tests: **50 passed**.
- New 1.1-A tests: 13.
- Python compile check: passed.
- v1.1 API smoke test: passed.

## I. BIZET OS 1.0 regression status
Legacy suite run separately: **37/37 passed**.

No existing Room, Appliance, Compatibility, Module, Ranking or FinalValidation logic was rewritten for 1.1-A.

## J. Open Questions
These do **not** block freezing the foundation but must be answered/expanded in later Builds:
1. Full dependency graph: which downstream decisions require recalculation vs explicit user reconfirmation for every future field.
2. Final enumerations/data schemas for product types and complexity categories I–V.
3. Persistent transactional monthly `order_no` counter once real database persistence replaces in-memory storage.
4. Exact long-term project file compatibility/migration policy across future 1.1.x/1.2 versions.
5. Final client-facing message vocabulary; current mapper is a structural placeholder only.
6. Whether future ProjectState stores full generated candidate payloads or normalized entity references plus generated snapshots.
7. Authentication/ownership semantics for cloud projects (deferred to Build 1.1-N).

## K. Deliberately not implemented
- Adaptive Quest Engine/UI
- Start Experience
- new 3D viewport
- measurement quest/map
- scan ingestion
- communications/appliance visual quest
- material/complectation UI
- manufacturing engine
- pricing engine
- accounts/cloud archive
- external Polycam/SketchUp adapters
- template layer

## L. Freeze-ready decisions
The following are ready to freeze if owner approves:
- ProjectState is the canonical state contract for OS 1.1.
- UI/3D are consumers of ProjectState, not sources of truth.
- Changes flow through mutation/dependency services.
- Project format and rule-set versions are stored per project.
- `order_no` is the 1.1 term; `application_no` is legacy compatibility only.
- Legacy furniture engines remain isolated and are reached through an adapter.
- Missing data required by the legacy engine causes adapter failure; it is not silently invented.
- Internal engine state and client-facing messages have a formal boundary.

## Freeze recommendation
**FREEZE CANDIDATE: YES**, subject to owner approval.
