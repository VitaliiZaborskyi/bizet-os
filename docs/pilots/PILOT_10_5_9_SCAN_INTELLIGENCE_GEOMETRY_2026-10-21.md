# BIZET OS — Pilot 10.5.9, owner-approved scan & geometry revision
Date: 2026-10-21. Development branch: pilot-10.5.9-geometry-visual-20261021. PR #11 (draft). Base: 10.5.8 Scan Refinement preview-current at 2d915c688e30d6e4c83a778beb3199831014ab76. Do not merge main without approval.

## Confirmed owner direction

- Main user goal: one kitchen construction end-to-end by end of 2026, first for owner's internal use, later TriArt. TriArt source-library dependency deferred; use generic concept, not fantasy details.
- Scan is PRELIMINARY dimension source until laser / angles / factory measurement evidence; room wall semantics belong to the owner.
- Scan pilot must be one unified route, accept Zip, original textured GLB, and if available Polycam simplified wall mesh; do not force the owner to export twice. BIZET suggests planes automatically, user selects, corrects and names; red semi-transparent plane selection; communication markers and measured dimensions belong to a wall. Current source is a geometry-based local candidate detector, NOT solved universal AI scene understanding. Need owner iPhone acceptance.
- Source user test: A & Б faces of one architectural protrusion, В & Г are true main room walls, but NEVER force those names/semantics in other rooms.
- Template cabinets: shelf count chosen by user 0..5 (upper/lower/tall alike), manual fixed-shelf movement FROZEN; equal CLEAR internal compartments, accounting for 18 mm shelf thickness, no user overrides applied while frozen.
- Standard base worktop 600 mm, front overhang relative to facade 20 mm and to carcass 40 mm; wall-to-carcass-front = 560 mm; installation rear gap 45 mm; carcass depth 515 mm. 500 mm drawer slides need vendor-minimum clearance (owner example >=513 mm), not blindly 450 mm rails. Correct calculations must flow into structural geometry and future BOM/CNC; DO NOT treat previously generated manufacturing data as automatically reconciled merely because 3D geometry changed.
- Upper cupboard: side panels remain 320 mm nominal depth, TOP ends short by 1 mm at facade + 20 mm at rear = 21 mm; back panel recessed/in groove, bottom remains full depth and requires the rear groove. Current 3D groove is a parametric placeholder; cutting routing details and exact production BOM/CNC must be validated against vendor-library geometry.
- Above sink: UPPER_DRYER on matching run width, TWO rack tiers; PLATES lower, GLASSES upper, variant selectable in menu 03. Current low-poly basket variants NOT manufacturer articles.
- Visual assets are serious: recognizable European concealed hinge proxy with cup, plate and arms, adjustable foot with ground pad, mounting plate and ring; keep source model slots so exact supplier library geometry later replaces prototype. No verified 35 mm drilling cycles or factory XML machining claims in this visual pilot.
- Oven cabinet must have open / absent back around oven to avoid z-fighting and wrong carcass closure, while preserving required structural supports (verify on device).
- VIEW mode must reach module isolation even with open facade. Current pilot uses double tap on facade or tap on non-movable carcass, plus module-strip selection; owner must approve gesture.
- Only one visualization entry in main menu item 07; no floating/top duplicate. Restore full mobile safe area, "Back" and dimensional controls. Paid generated image provider feature remains MUST HAVE but INVESTMENT HOLD. Do not spend API resources.
- PDF and raster import human-logic scenario NEXT after scan polish, before 10.6.0. 10.6.0 starts voice controls. Focus on voice through 10.7. 10.7 begins catalog libraries separated into carcass/structural, facade, decorative layers, then verified hardware and CNC machining.
- Quadro XML WITH MACHINING (hardware screw and hinge boring) is NEXT-STEP MUST HAVE for a credible partner demo. Do not dismiss or "forbid entirely"; create a controlled test dataset with explicitly named catalog assumptions when owner later authorizes. Not implemented as verified output in this release.

## Implemented in branch, subject to CI & owner inspection

- /scan source-preserving 3D viewer: imported source model, automatic sampled normals planes with confidence scores; marked preview is a red 3D plane & red top strip, correction length/height/rotation/lateral offset, wall label/type and attached communications. Proposals are not verified, and not every closed mesh is a wall. For unmatched scans manual 2-point line persists.
- Unifies scan navigation, skips legacy scan modal and first-time overlay. Upload UI has one user-facing browse action, also drop zone. ZIP remains in browser. External Polycam HTTPS may NOT launch installed native iPhone application.
- Fixed equal-clear shelf-center routine & frozen displacement; 5 shelves maximum; 3D viewer updated.
- Base carcass 515 mm, rear 45 mm, standard 600 mm worktop depth placement; needs detailed factory/material audit.
- Upper ROOF 1+20 inset, back panel 20 recess, bottom full depth, groove metadata blocked until manufacturing profile verified.
- Sink matching upper drying 2 tiers visual and variant in item 03.
- Improved visual foot/hinge and oven open-back.
- 07 viz only, full safe-area mobile navigation and focus controls.

## Acceptance gates / unsolved

1. CI green exact branch commit, then Render LIVE exact same commit.
2. iPhone directly load owner Polycam ZIP, both source texture + clean walls; do not claim precision without owner approval.
3. New detector may merge collinear surfaces, miss irregular/curved walls or mistake furniture for wall. Owner can manually correct. Its confidence is a heuristic, not certified statistical certainty.
4. Selection is via list of proposed planes, not yet robust arbitrary touch-hit for every rendered wall; upgrade after hands-on device QA if required.
5. Registered walls are PRELIMINARY_UNVERIFIED and do not overwrite canonical room geometry / project production measures until accepted verified scan+laser step.
6. 515 mm case may support 500 mm rails in owner's case, but exact required installation must be verified by article; no invention of vendor catalogue support, mounting hole map, or actual Quadro adaptation.
7. 1+20 mm upper roof and back groove visualizes placement. CNC groove toolpath still needs exact board thickness, joinery profile, wall hanger and vendor profile.
8. Inspect double tap vs expected one-tap isolation on iPhone; menu 07 tap and return from focus after open door.
9. Verify actual scene occlusion (oven / wall / plinth), low-poly hinge leg render, dryer 2 tiers in VIEW and isolation, no mobile footer cropping.
10. Confirm 10.5.7 locked prompt and server image provider remain present but do not spend anything.
11. Do not present screenshot-only output as finished CAD or end-to-end machine-ready XML.

## Checkpoint invariants

ProjectState -> Constraint/Connection Graph -> Machining -> BOM -> XML; machine-specific compatibility verified by real known-good supplier samples. Historical rules preserved; superseded defaults documented, not silently thrown away. Keep all source code in isolated GitHub branch; do not push to main.
