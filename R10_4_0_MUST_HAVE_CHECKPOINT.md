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
