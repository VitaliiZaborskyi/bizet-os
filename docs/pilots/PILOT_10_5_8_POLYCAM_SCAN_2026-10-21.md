# BIZET OS — PILOT 10.5.8 / POLYCAM SCAN REGISTRATION

Owner order: develop a **real SCAN pilot** based on Polycam GLB and owner's annotated screenshot. Keep paid photorealistic Image AI in 10.5.7 available but on **investment hold**. Do not buy services, change provider keys, or run paid render tests. Base branch preview-current at 6e293a13d64ec7476d5d2899e777be7941449358; branch pilot-10.5.8-polycam-scan-20261021. Do not merge to main.

## Confirmed sample (only source-derived facts)

Polycam original 13.08.2026.glb and 13.08.2026 2.zip were supplied by owner. Scan GLB 2.0 includes embedded JPEG texture and mesh; diagnostic raw XYZ bounds approximately 6.33m X, 3.01m Y vertical, 4.20m Z. This is **whole scanned mesh**, not guaranteed true room interior. 3D scan is required to preserve visible wiring, sockets, ventilation and obstructions, not just planar contours.

Owner supplied an **oriented** plan sketch annotated in Cyrillic:
- А and Б = faces of **one architectural protrusion**, intended panel cladding.
- В and Г = **principal walls** of the room.
- Kitchen placement along В. High tall cabinet wraps near corner facing Г; do not simplify as a regular second full kitchen run without owner's approval.
- Entry and tall-cabinet turn are semantic markers.
- The generated style photograph is a REFERENCE illustrating intended cabinetry, not source-of-truth geometry.

## Why the old importer was inadequate

Existing room-latest.js accepts GLB/GLTF, parses mesh and extracts vertical multi-slice plane contour; in its user-facing view it projects up to 700 sparse triangle edges and derived contours. It does not display original phototextured GLTF material. Start screen button and workspace Scan action were **WIP text**, though old room UI contains two scan path buttons. This produced a line fragment cloud that can be rotated independently from source and can mislead room dimensions.

## PILOT 10.5.8 implemented

1. New /scan entry linked from start source SCAN and workspace room-source-scan. Existing TEMPLATE and PDF/photo inputs preserved.
2. Source choice screen:
   - Upload existing GLB / GLTF with BIN/JPEG/PNG resources, client-local.
   - New scan launches external Polycam / SketchUp selectable by device; **no claim** that Apple RoomPlan or native scanning is embedded yet.
3. Full source GLB mesh rendered via THREE.GLTFLoader with its embedded original photographic material, OrbitControls and toggles for texture/mesh (no more sparse-only preview).
4. Correct initial top view looks **downward along -Y from positive Y** (not underside); user can orbit, rotate plan +/-90 and reflect horizontally. All transformations are reversible and serialized. Automatic semantic alignment with owner's physical entrance remains OPEN.
5. True owner annotation requires **two click points per linear wall** A, Б, В, Г, with roles and clearly separate geometry. Entry and tall-cabinet turn can be placed as point markers.
6. Known owner measurement can be entered for a marked wall to compute a tentative ratio; this never updates canonical room dimensions on its own.
7. Only tiny ProjectState scene.visual_settings.scan_registration_r1058 metadata is saved: source SHA-256, raw scanned dimensions and original offset, plan transformation, semantically tagged line endpoints, optional unconfirmed measured dimension. Binary GLB **stays on the user's device and must be reloaded after browser refresh**; reload with the same hash restores markers. No source texture or raw room photo uploaded to server.
8. STOP_UNCONFIRMED_SCANNED_GEOMETRY. Does not alter room.geometry.wall_length/depth/height, modules, any production/BOM/XML data. Confirmed factory geometry must come from owner verified laser / tape dimensions in separate phase.

## 3 shared workflow scenarios

- TEMPLATE: existing manual room template; stays unchanged.
- PRELIMINARY_SCAN: fast client presentation + true textured scan + wall markup; strict STOP manufacturing.
- VERIFIED_MEASUREMENTS: later stage with laser, angle, step/door/window dimensions; factory export only after checks, not delivered as "done" in 10.5.8.

## Open issues / owner acceptance

- Full device QA on iPhone Safari and desktop: WebGL textures, render speed, orientation, 3D camera, touch/pinch, GLB recognition.
- Compare user-supplied annotated GLB reference against on-screen top view. How many 90-degree steps/mirror are needed? Save and restore exact orientation.
- Verify that the correct architectural protrusion lines really follow the source point cloud and do not include scan artifacts.
- Verify scan coordinate origin point and mapping relative to room engineering axes and wall В placement. No automatic CNC validity.
- Native app deep-linking / scanner capture will require official provider integration; in this pilot buttons open external Polycam and SketchUp links.
- Automatic segmentation of meshes into walls, windows, sockets and protrusions is future scoped, requiring per-feature confidence+owner review. We do not claim AI semantic object recognition is already delivered.
- Persisted source binary hosting (encrypted project attachment, retention, rights), later phase, no new paid service.
- Possible issue: jsDelivr CDN dependency for THREE WebGL libraries, already used by BIZET OS. Device may block CDN.
- Later prepare actual (room perspective / camera) 3D environment alignment of the full scan and engineered kitchen after accepting wall labels and known scale.

## Acceptance gates

- [ ] Exact commit source tests on GitHub green.
- [ ] Preview-current deployed LIVE SHA equals branch HEAD; main unchanged.
- [ ] New /scan returns HTTP 200 and opens from start & workspace.
- [ ] Owner loads 13.08.2026.glb on iPhone, sees phototexture on all mesh, not lines.
- [ ] Owner confirms TOP view is overhead (can rotate/reflect).
- [ ] Owner annotates А+Б protrusion and В+Г primary and saves to same project.
- [ ] Reload same source filename / SHA and verify restoration of marks.
- [ ] Existing kitchen editor/BOM/XML/visualization functionality not regressed.
- [ ] Manufacturing exports still use verified ProjectState only.

## PAUSED MUST HAVE — REAL PHOTO VISUALIZATION

Keep visualization and its locked prompt in every future checkpoint and test branch as feature Viz 10.5.7. **Do not** spend money/consume OpenAI API tokens to test or scale image generation before owner explicitly approves investment. Potential implementations remain OpenAI API, lower-cost pay-per-use provider, hired GPU, self-hosted GPU. Paid provider activation and real generated image acceptance remain OPEN. Preserve code and current UI, avoid changes for this scan pilot.
