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
