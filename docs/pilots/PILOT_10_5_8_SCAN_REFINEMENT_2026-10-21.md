# BIZET OS 10.5.8 Scan — owner refinements, 21 October 2026

Base release: BIZET OS 10.5.8 exact GitHub+Render SHA ef199de67e554b8022cfe3d8b622fec3c8043de8. Isolated development branch: pilot-10.5.8-scan-refinement-20261021, draft PR #10. Do NOT merge main.

## Owner-tested feedback (accepted into design)

Owner loaded a **different** Polycam GLB with the filename 03.04.2026.glb and captured an iPhone screenshot. Screenshot is evidence of a 3D plan/white wall-like mesh, 5 meshes, around 0.01MB. The GLB itself was NOT supplied and cannot be inferred from pixels. Do not claim its exact bounds, model nodes or textures.

1. "Launch Polycam" currently opens App Store though the app is already installed. Replace primary App Store URL with HTTPS https://poly.cam/ ; launch may open a browser and NOT necessarily installed app. A verified native iOS Polycam deep-link is not documented in our sources; MUST not invent polycam:// or a guaranteed app launch. Provide separate clearly labeled App Store fallback.
2. The walls A/Б and В/Г and high turning cabinet are specific to the owner's original showcase scan, NOT defaults for every room. New pilot should allow arbitrary many walls with arbitrary owner labels and per-wall type (main wall, protrusion, partition, other). Remove the fixed "turn cabinet" marker from the scanner. Preserve existing showroom annotation on reload.
3. Clarify the point-marking algorithm: top-down room plan; select wall from dynamic list or create another; tap start point, then end point; show an editable segment in the scan coordinate system; set type and optional label; save unconfirmed. Two taps are MANUAL TRACE, NOT automatic wall recognition; no manufacturer geometry claims.
4. Polycam ZIP exports should work without manual extraction. Browser client can inspect archive, decompress locally, load GLB/GLTF and their corresponding resources, allow owner to choose model when multiple. Reject encrypted or ZIP64 archives, unsafe paths, abnormal file counts, large expanded sizes and missing 3D formats; do not forward binary to the server. Uses fflate@0.8.3 in browser (CDN); new external network dependency, device QA required. Owner's previous 13.08.2026 2.zip contains just 13.08.2026.glb.
5. Model mode exported from Polycam with already prepared wall geometry is a valuable SECOND SOURCE alongside the phototextured dense scan. BIZET should retain full model preview and must not pretend the simplified mesh provides photo evidence of outlets or cables. Future: check model-level wall node semantics and registration alignment (same project, not assumed).

## Implemented UX

/scan stays on 10.5.8 and remains client-local. ZIP/GLB/GLTF upload; option for multiple models in ZIP; top view + true mesh orbit, reversible rotation and mirroring; wall editor with Add wall, editable designation and semantic type; optional Entrance marker. Saved scene.visual_settings.scan_registration_r1058 now records wall_definitions plus semantically tagged two-point lines. Historical A/Б/В/Г tags can be reopened, but not forced on new scans.

All saved source model dimensions are PRELIMINARY_UNVERIFIED. Image AI generation stays INVESTMENT HOLD (must-have remains enabled but no paid testing). Main unchanged, BOM/XML/machining never come from this markup.

## Mandatory owner acceptance

- Load 13.08.2026 2.zip directly from iPhone Files into scanner, confirm textured source and no manual unzip.
- For a ZIP containing several GLB/GLTF models, test selector.
- Upload actual 03.04.2026.glb or its ZIP so we can inspect glTF node semantics and room orientation. On screenshot it appears a lightweight clean wall model (5 meshes / 0.01MB).
- Test Add wall five times, mark at least 6 independent lines, rename and change semantic type, save and reload original scan.
- Test zoom, touch and points in top view on iPhone.
- Check Polycam button: should no longer open App Store directly; native installed-app launch may still require first-party support and is NOT guaranteed.
- Verify production_ready:false, no mutations of any room.geometry dimensions, no BOM/XML data generated from preview.
- Validate source capture and clean wall model alignment before adopting automatic segmentation.
- Real browser test and ZIP runtime verification remain OPEN; green CI alone does not certify device acceptance.

## Important control

The user-approved 3 scenarios remain TEMPLATE / PRELIMINARY_SCAN / VERIFIED_MEASUREMENTS. User photo AI visualization remains mandatory but on owner investment hold; never reconfigure API or incur paid generation while scan work proceeds.
