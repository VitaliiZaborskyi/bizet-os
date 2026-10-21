# BIZET OS 10.5.9 — OWNER PILOT: SCAN INTELLIGENCE + KITCHEN VISUAL / GEOMETRY

Date: 21 October 2026. Owner approval: "Собирай новый пилот со всеми правками". Base source branch preview-current at commit 2d915c688e30d6e4c83a778beb3199831014ab76; independent build branch pilot-10.5.9-geometry-visual-20261021; draft pull request #11. Main is protected and not merged.

## Approved scope: smart scan

- One canonical /scan route, no auto-reappearing historic "How should we obtain geometry" upload screen from /room; one primary action "Загрузить скан", other action "Создать новый скан", file import via ZIP or GLB/GLTF. External Polycam / SketchUp may not provide guaranteed native application deep-link.
- True original 3D and photo texture remain available; lightweight Polycam wall-geometry exports are also supported.
- New client-side OFFLINE geometric candidate segmentation (vertical triangle planes and support clustering with confidence). This detects only CANDIDATES, not all possible walls; will not understand every door/window/pipe/box automatically. Must not claim to have a complete BIM model from source mesh.
- The chosen candidate highlights as a transparent red rectangle/surface. User can rename, change semantic type, set length in mm, adjust height, translate offset and rotate angle; add utilities anchored by type and distance along selected wall + height from floor. Source coordinates and preliminary suggestions remain individually unconfirmed for machining.
- Arbitrary wall count; original owner's A/B protrusion and V/G principal wall orientation is ONLY an example, not a forced four-wall policy. Specific case turning tall cabinet remains a furniture assembly, never a generic scan button.
- Save source SHA, owner marks, geometry suggestions, utilities and plan orientation in scene.visual_settings.scan_registration_r1058 (legacy storage key kept for existing projects). Original GLB binary remains on-device, not uploaded. STOP_UNCONFIRMED_SCANNED_GEOMETRY.

## Owner HARD geometry and furniture rules

1. One to five shelves in any eligible ordinary lower, upper or plain tall cabinet (never over five); choose quantity in module settings; equal **clear** opening heights among count + 1 compartments. Historical manual fixed-shelf position editing FROZEN. No false certification of hinges/manufacturer positions from pilot. Specialized modules retain mechanical exceptions.
2. Standard 600 mm top wall-to-front + front extension relative to carcass 40 mm = front coordinate 560 mm. Rear carcass wall clearance 45 mm. Cabinet carcass 515 mm. A 500mm nominal drawer runner needs at least 513mm body depth by owner rule. Alternative if small cabinet is 450mm nominal. Vendor model/articulated drilling not yet fixed.
3. Upper carcass full bottom depth; top horizontal board depth 21mm shorter: 1mm front setback + 20mm back setback. Rear board is in a recess/groove in side and bottom boards. Pilot 3D/back-panel placement and Point B preliminary BOM dimensions changed together, but exact CNC groove cutter and panel article remain UNVERIFIED; do not export as verified machine instructions.
4. Remove oven back-board from its appliance cavity to stop geometry z-fighting. Do not silently invent other structural oven supports beyond sourced module rules.
5. Top sink module auto-resolves to UPPER_DRYER / dish dryer, width along wall equals sink base width; bottom wire rack for plates; top rack for cups and glasses. Generic STANDARD/WIDE/COMPACT two-tier visual variants selectable in Settings #03. No specific manufacturer SKU or hardware drilling is asserted yet.
6. Hinges: multi-part low-poly concealed cup/mounting arm/plate visual analog. Legs: foot plate, taper housing, adjusting ring, threaded rod, rubber foot. Visual proportions not proprietary licensed meshes and not machine drill instructions.
7. VIEW module interaction: single tap facade toggles open; double tap same facade enters module isolation; tapping exposed carcass inside opens isolation regardless facade angle. Must test on real iPhone touch and desktop mouse.
8. Exactly seven bottom menu items for mobile; visualization only INSIDE menu #07 (including export), not in overlay header, not as extra menu item above #01. Ensure focus BACK and DIMENSIONS and safe-area navigation visible, especially iPhone home bar.
9. Existing photorealistic image workflow R10.5.7 remains MUST HAVE but INVESTMENT HOLD. Do not initiate paid render calls or provision OpenAI provider keys during scan and 3D polish.
10. Native voice control planned for 10.6.0 with iterative improvements to 10.7.0; PDFs, raster photos and user human-like inference rules should be explored **after scanner** and BEFORE 10.6.0. At 10.7 introduce canonical parameterizable libraries for carcasses, facades and decorative materials; manufacturer hardware, complete drills, screws, real joints and compatibility maps.

## MUST HAVE FUTURE — Quadro processing demonstration

Owner wants a true Quadro XML with coordinates, correct holes, hinge plate drill positions, guides and hardware references (potential pilot Blum examples 22.5 mm cup edge and 37 mm plate offset subject to exact model). This is STRICT NEXT STAGE, NOT 10.5.9. Do not misrepresent unresolved pilot drill values as machine-approved. The long-term workflow will ultimately support Quadro and Viyar and TriArt supplier imports. In 10.5.9 focus on photoreal-ish 3D, everyday usability and the generic BIZET OS architecture, rather than manufacturer-specific catalogs.

## Pilot acceptance boundaries

- Source branch tests green; deploy current verified head to Render, ensure live deployed SHA.
- Real owner iPhone test: original 13.08.2026 textured GLB and simplified 03.04.2026 GLB, ZIP auto, auto-plane detection quality/false positives, edit red rectangles, add utilities, orientation persistence.
- Acceptance required for 515+45 cabinet, 600 top, top roof short/back recess, full-depth bottom, equal shelf compartments with counts 1/2/3/4/5, drying rack 2 tiers, open-facade focus, no flashing oven, upgraded feet/hinges, 7-item mobile nav.
- BOM PointB cut list and WebGL model should derive from same ProjectState parameters; vendor groove machining and Quadro/XML actual processing not certified. Observe legacy wall B/C cut-list limitations and owner acceptance of one verified kitchen baseline first.
- No automatic production export on a scan candidate. Do not modify main.
