# BIZET OS — R10.4.0 MUST HAVE CHECKPOINT

Date: 2026-09-26
Status: active checkpoint list

## 🔴 CRITICAL — iPhone module isolation / 3D autoregeneration

The module isolation transition on iPhone is still NOT resolved.

Observed owner QA result:
- selecting a module does not reliably present the isolated module immediately;
- the isolated view may appear only after an extra touch / interaction with the 3D area;
- the issue remained after R10.3.6, R10.3.7 and R10.3.8;
- resize lifecycle, forced canvas repaint, compositor forcing and a separate focus canvas did not close the issue.

R10.4.0 must NOT mark this as solved without direct iPhone owner QA.
Any feature that promises "module setting → immediate 3D update" remains dependent on this open issue.

## MUST HAVE — one engineering core, two UX shells

BIZET OS remains one system and one engineering codebase.

Required UX architecture:
- MOBILE_WORKSPACE — phone-first interaction, one main task per screen, large touch targets, compact panels, mobile focus flows.
- DESKTOP_WORKSPACE — laptop/desktop interaction, persistent large 3D area, side/context panels, mouse/trackpad-first controls, more information visible at once.

Shared between both shells:
- ProjectState;
- furniture and production rules;
- geometry and module logic;
- pricing / BOM / documents;
- API and persistence;
- 3D data model.

Do not fork business logic or create two independent products.

## MUST HAVE — one-screen selection grammar

For unapproved Start Experience selection screens:
- one screen = one question / one action;
- no vertical scrolling for ordinary option selection on the target phone viewport;
- ordinary choices use a balanced grid;
- a special / fallback choice is a compact separate action below the grid;
- already approved screens stay visually frozen unless the owner explicitly reopens them.

R10.3.9 establishes this grammar for Zone, Equipment level and Kitchen configuration.

## R10.4.0 integrity rule

R10.4.0 should be treated as a coherence release, not a collection of isolated patches.
Before calling it ready, mobile and desktop flows must be reviewed as complete user journeys, while the critical iPhone isolation bug stays explicitly visible until verified closed.

## R10.4.0 frozen owner decisions — 2026-09-27

- Plinth behavior is **Variant A**: overall worktop height remains 900 mm; changing plinth height changes lower-carcass body height (900 - worktop 38 - plinth).
- Plain tall cabinets may use 1–3 hinged facade zones, up to 3 shelves, and hidden or visible drawer blocks.
- HARD: the total height of the visible drawer block in a plain tall cabinet may not exceed **862 mm** (900 - worktop 38).
- Tall cabinets with appliances are intentionally left on the current logic until the module-library phase.
- Upper horizontal facades may use a lift mechanism or hinges + lift; the exact hardware system and price remain library data and must not be invented in R10.4.0.
- Module edits are draft changes in isolation. They become part of the saved kitchen only after the user presses **Save module**.
- Isolation shows the changing price of the active module, not the total project price.
- Ordinary lower cabinets use two structural rails/ribs (front + rear), except sink and lower-oven constructions which retain their own rules.
- Ordinary upper cabinets have no generic structural ribs; hood and dish-dryer modules remain special cases.
- Room and furniture material selection is introduced with a small pilot preset library plus custom texture upload. A future photoreal visualization renderer consumes the same saved material/geometry data; the engineering canvas itself is not presented as photoreal rendering.

The critical iPhone isolation-paint issue above remains OPEN until direct owner QA closes it.

## R10.4.1 bridge-to-R10.5 QA targets — 2026-09-27

R10.4.1 is a stabilization pass before R10.5, not a feature-expansion release.

Owner QA targets:
- one tap must enter module focus reliably on iPhone; no repeated tapping and no whole-page scrolling in focus;
- the module editor must be populated immediately on focus entry;
- English lower generic modules must display as **Base cabinet**;
- mezzanine cabinets remain separate modules with their own IDs/numbers and own focus entries;
- focus header supports previous / next module plus a dropdown list of all modules;
- # toggles kitchen numbering without changing project data;
- compact square leg proxies and Ø35 hinge cups must scale with the model;
- handle geometry keeps at least 40 mm from the nearest facade edge;
- renderer depth ordering must keep facade planes readable while rotating;
- customer secondary action is **Save project / Сохранить проект**;
- order reference display expands the year to four digits so 26.09 cannot be misread as a day/month date.

The historical iPhone focus-paint bug remains OPEN until direct owner QA confirms reliable first-tap entry.

## R10.4.2 package — 2026-09-27

Owner QA closed the historical iPhone isolation bug after R10.4.1: first-tap module isolation is now accepted as working well. Do not regress this lifecycle.

R10.4.2 contracts:
- oven width is a hard select: 600 or 900 mm only;
- two-finger movement pans the 3D view while pinch zoom and one-finger rotation remain available;
- focus exit is `Back / Назад`;
- complexity choice V is labelled `Custom configuration / Своя конфигурация`;
- display currency choices are UAH, EUR, USD and AUD; conversion is display-only and sourced from the official NBU rate endpoint;
- Project Settings 01–06 and Material Picker use one centralized RU/EN dictionary;
- refrigerators are hard-pinned to the edge of a run and may never sit between ordinary base modules;
- hinged cabinets default to vertical handles, drawers to horizontal handles; nearest handle edge keeps a minimum 40 mm facade clearance;
- Project Settings includes a new General section for handles, plinth, display currency and demo document tools;
- Save module commits the edit, recalculates, and returns to the full-kitchen view;
- BOM TEST is visible for owner/demo and downloadable as CSV;
- client approval drawings are a separate three-page pilot document: plan + axonometry, main elevation, typical sections; title block is BIZET by Zaborsky and explicitly FOR APPROVAL — NOT FOR PRODUCTION;
- main secondary action is `Скачать предложение / OFFER`; OFFER lets the client select commercial proposal, approval drawings, or both;
- visualization logic exposes a geometry-locked VisualizationPayload and master prompt; no external photoreal render provider is falsely claimed as connected;
- e-mail delivery uses the existing Resend path, PDF attachments, and reply-to cdbbizet@gmail.com when configured; secrets stay in Render environment only;
- WhatsApp demo channel opens +380974587676 with a prefilled order reference; automatic document delivery requires WhatsApp Business API and is not simulated.

## R10.4.3 owner QA corrections — 2026-09-27

- R10.4.3 stays on the R10.4 line; R10.5 is intentionally deferred.
- Start Experience must show `Своя конфигурация / Custom configuration` without a visible Roman `V`, and the Template / Scan / File screen has no redundant Continue-to-configuration button. Start assets must be cache-busted so owner QA sees the current source.
- Display currency UAH/EUR/USD/AUD is a project-global setting visible from the normal workspace. Saved/random variants must never overwrite it.
- Commercial proposal amounts carry an explicit currency code. Proposal copy must describe only the current saved configuration and separate document types; unsupported validation claims are removed.
- Built-in refrigerator: lower facade, when present, may not exceed the neighboring lower-cabinet facade height; bottom ventilation cutout is Ø250 mm; the cabinet top aligns to the overall kitchen top; a single board part may not exceed 2780×2060 mm and must be segmented when required.
- Plinth uses the same 4100 mm segmentation logic as the worktop. It continues under built-in refrigerator/tall built-ins. Every additional plinth piece/joint adds one universal straight/corner connector at 50 UAH.
- Built-in and freestanding hood types must produce visibly different 3D appliance representations; a freestanding hood is not detailed as a wall-cabinet carcass.
- Live RU↔EN switching must rerender current workspace chrome, panels, Material Picker, isolation editor, dynamic statuses and OFFER flow. Isolation currency label is `Currency` in English.
- Corrected oven rule: for Category I without Gola, the lower-oven support shelf top is exactly 600 mm below the top of the cabinet body, excluding the countertop. Do not apply or invent the Gola version yet.
- Sink base uses exactly two vertical rails parallel to the facade: front rail flush with front side-panel edges; rear rail flush with rear edges and its top is 150 mm below the cabinet top.
- Approval drawings stay at pilot quality in R10.4.3; no drawing-polish scope is added.
- The R10.4.1 first-tap iPhone isolation lifecycle remains accepted CLOSED and is a no-regression contract.


## R10.4.4 owner polish + hard rules — 2026-09-27

- Currency selector lives only in the main commercial/price area, left of the final price; it is removed from 3D controls and module isolation.
- iPhone module-edit numeric/select fields use >=16 px text and Save blurs the active field before returning to the full kitchen to prevent Safari focus zoom from sticking.
- Custom configuration remains a blue special choice and now explicitly reports that the feature is in development instead of acting like a broken button.
- Category I/II board worktops: a joint may not sit on either module boundary touching the sink. The planner selects the nearest earlier valid module boundary <=4100 mm; if no valid boundary exists, the configuration is flagged HARD for reconfiguration.
- Plinth remains max 4100 mm per piece, joints are visible in 3D, and the universal plinth connector remains one per joint.
- Straight WALL_CENTER kitchens receive default end panels at both wall ends. Panels stay within each module's own height (never run to the floor). Composite/tall + mezzanine constructions receive separate panels per module layer. Isolation exposes Flat End Panel or L-shaped 40 mm filler and Carcass/Facade material.
- Sink base includes one shelf plus the previously frozen two vertical facade-parallel rails; the shelf carries a rear service clearance for plumbing.
- Hinged 3-door configuration is available only at exactly 900 mm. Below 900 the third-door option is disabled and any invalid draft is forced back to two doors. Hinge directions determine middle-side boundaries; all-left/all-right three-door layouts create two middle sides. Shelves are split by those middle sides into separate compartment shelves in 3D and BOM.
- Built-in hood construction: appliance shown physically; duct Ø150 mm, pipe axis centered horizontally and 110 mm from the rear wall; lower shelf immediately above hood, second shelf above, two three-sided U-shaped duct claddings, and Ø150 cut-outs in both shelves and cabinet top. 900 mm hood keeps the same centerline and only widens symmetrically.
- Single-row upper cabinet height >900 mm (not mezzanine UPPER_TOP) receives a second left/right hanger set in 3D and BOM/hardware count.
- Visualization master prompt is system-internal only. OFFER no longer shows/copies it. The current dynamic prompt and VisualizationPayload are passed internally with OFFER payload; if an external render URL exists it is used in the proposal, otherwise the engineering preview remains the fallback until the 10.5 render provider is connected.
- R10.4.3 approval drawings remain prototype quality; no drawing-polish scope is added here.
- R10.4.1 first-tap isolation behavior remains a no-regression contract.


## R10.4.5 module settings + visual polish — 2026-09-27

- MODULE_FOCUS_MODE keeps module navigation/name at the top-right; Back and dimensions controls move to the lower-left safe area so the controls never collide.
- Normal kitchen view no longer uses anchor/system role colouring. All cabinetry uses the same selected project material/colour by default; key modules are distinguished by geometry/appliances, not orange/yellow facade highlighting.
- Built-in hood internals (duct, shelves, U-shaped cladding and Ø150 cut-outs) are technical isolation detail only. In the full-kitchen view the hood cabinet remains an opaque cabinet with only the hood appliance detail visible.
- Project settings tab 03 is renamed from “Верхние модули / Wall cabinets” to “Настройка модулей / Module settings”.
- Tab 03 now owns global module dimensions: lower total height, upper height, gap between lower and upper, lower depth, upper depth and plinth height.
- Plinth height is removed from Room and General settings. Variant A remains HARD: changing plinth height changes lower carcass height while preserving the selected overall lower-row height.
- Default dimension inputs preserve the current project appearance: lower total height 900 mm, upper height 1000 mm, gap 600 mm, lower depth 560 mm, upper depth 320 mm, plinth 100 mm.
