# BIZET OS 10.5.7 — Visualization Integration Pilot

Date: 2026-10-21. Base 10.5.6: 0adf90f066cbca2a900a5058c6dc519a13de3e67.
Branch: pilot-10.5.7-visualization-20261021.
Draft PR: https://github.com/VitaliiZaborskyi/bizet-os/pull/8 — DO NOT MERGE into main.

## Objective and implementation

The primary Визуализация action is the FIRST item in the workspace menu, as approved for 10.5.7. It launches an independent two-pane modal: upper result, lower locked prompt and nonstructural user addendum.

Flow: current BizetModelRuntime canonical scene + real BizetKitchenWebGL canvas PNG screenshot → POST /api/v1.1/visualization/prompt → immutable authoritative base prompt preview → POST /api/v1.1/visualization/generate → OpenAI Images Edit provider → output PNG → Save image or Generate again.

A real image never substitutes geometry, BOM, XML, cabinet details or machine drilling. State machine: IDLE / READY / GENERATING / SUCCESS / ERROR. On ProjectState change, cached generated result becomes stale.

## Binding visual rule registry

- VIZ-HARD-001–003: identical canonical room, modules, measurements, facade layout, appliance locations, handles, materials and Kelvin.
- VIZ-HARD-004–005: immutable system prompt, user text only mood/decor/nonstructural light atmosphere.
- VIZ-HARD-006: NEVER place outlets/switches beside the sink or cooktop; absent confirmed electrical layout, omit instead of inventing.
- VIZ-HARD-007: 40mm filler required when refrigerator meets a wall in the ENGINEERING model. If source is missing this detail, show FRIDGE_WALL_FILLER_40MM_UNRESOLVED; DO NOT secretly invent it in visualization.
- VIZ-HARD-008: every required handle visible, correctly oriented, matches selected rectangular bar model, no artifacts.
- VIZ-HARD-009: if cabinet LEDs disabled, leave them off; if enabled, preserve project Kelvin.
- VIZ-HARD-010: cabinetry fronts, handles, appliances clearly legible and not concealed by decoration.
- VIZ-CURRENT: fruit bowl containing green apple, red apple, banana and orange; simple pan on hob only if they do not conceal project.
- VIZ-OPEN: source scene JSON and screenshot sometimes disagree about fridge side and upper facades. Show QA warning and do not falsely reconcile.

## Backend and paid provider setup

Existing server path: app/api/visualization_r1056.py (upgraded in 10.5.7).
GET /api/v1.1/visualization/status — whether real provider credentials are present.
POST /api/v1.1/visualization/prompt — canonical server prompt / SHA256 / warnings (free operation).
POST /api/v1.1/visualization/generate — real provider call, access-gated, paid by configured API account.

Owner must privately set environment variables in the Render service:
- OPENAI_API_KEY — billing-enabled OpenAI API key. NEVER paste this into website, chat or GitHub.
- BIZET_VISUALIZATION_ACCESS_CODE — a separate secret code to enter into BIZET UI.
- Optional BIZET_VISUALIZATION_MODEL — default gpt-image-2.5-sunburst, alternative gpt-image-2.5-flare.

The ChatGPT subscription does NOT itself supply API billing or an automatic API key. Provider remains OFF if no credentials. This is a deliberate visible error, not an image placeholder disguised as a generated result.

R10.5.7 endpoint sends a real PNG with server-locked prompt to OpenAI Images Edits at 1536×1024 medium quality. Never claim a live paid image was generated unless the owner has provided credentials and a real API response was verified.

## Quotas and guards

Per single-instance pilot: 90 seconds / client IP and 12 calls / calendar day / IP (server-local counters). This is not production-grade shared quota management.
Only PNG references below payload cap; reject missing or malformed canonical state, oversized scenes and corrupt input. Owner access code checked constant time. Raw API key is never present in frontend or in API response.

## Acceptance checklist

- [x] First primary bottom-menu Visualize button is visible in project.
- [x] Canonical screenshot and ProjectState present.
- [x] Locked server prompt with user-only addendum.
- [x] Real provider POST, success display, retry, PNG save.
- [x] Server credentials and quota guards.
- [x] Mocked no-billing provider roundtrip test.
- [ ] GitHub CI green on exact HEAD.
- [ ] Render LIVE on exact SHA.
- [ ] Render GET status ready:true (requires owner to set environment variables).
- [ ] ACTUAL nonmocked image generation and owner QA from desktop/iPhone.
- [ ] Source-to-output comparative QA for geometry, handles, plinth, filler and electrical restrictions.

Main branch protected by owner workflow: no merge authorized.
