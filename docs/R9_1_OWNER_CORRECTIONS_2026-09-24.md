# BIZET OS — R9.1 Owner Corrections

Date: 2026-09-24
Status: implementation package for the next pilot.
Base: R9 owner QA. R7 / R8 stable / R8-next are not modified.

## Current pilot — MUST implement

1. **R8 visual shell remains the UI baseline.**
   - Do not globally replace the R8 interface typography.
   - Keep the approved new BIZET OS brand layer and splash.

2. **Splash / transition.**
   - Keep the current motion, glow and colors.
   - Use the approved non-chrome reference letter shapes for ZABORSKY / BIZET / OS.
   - White ZABORSKY + BIZET, blue OS.
   - Play the source-video sound to completion.
   - Hold the final image briefly after audio finishes, then fade.
   - On platforms that block audible autoplay, wait for the first user gesture instead of silently dropping the sound.

3. **Top-right global controls.**
   - ? and ••• stay in exactly the same top-right position across all screens.
   - No horizontal drift between the first screen and later screens.

4. **RU / EN.**
   - Russian UI: Светлое / Тёмное / Другое.
   - English UI: Light / Dark / Other.
   - Route text follows the selected interface language.

5. **Workspace first view.**
   - After kitchen configuration: splash -> 3D workspace.
   - Show the full kitchen immediately.
   - Room dimensions and module dimensions remain visible.
   - Module strip remains visible below the scene.
   - Do NOT automatically open the room geometry editor.
   - Room geometry opens only after user selects “Помещение”.

6. **Button contrast.**
   - Any light/white button surface uses dark text in both light and dark themes.
   - Dark/blue primary buttons retain light text.

7. **Module edit / focus mode.**
   - Selected module is isolated and enlarged.
   - It remains freely rotatable by pointer/touch.
   - Editor is non-modal so the 3D focus view remains interactive.
   - Technical focus is semi-transparent and shows schematic construction:
     18 mm sides/top/bottom/back, shelves or drawer internals, rails/ribs, legs, hinges and fastener markers.
   - This is a pilot technical representation; exact production hardware geometry is refined later.

8. **Commercial proposal.**
   - One A4 sheet, concise, following the owner-provided “КП Мебель” structure.
   - One kitchen item, NOT a module-by-module table.
   - Include: kitchen name/configuration, current run dimensions, current 3D snapshot, concise specification, manufacturer, unit, qty, client price, total, short preliminary note.
   - Module/part/hardware breakdown belongs in the separate specification.
   - Document language follows interface language.
   - Century Gothic remains the document font standard.

9. **Keep existing working R9 functionality.**
   - Manufacturer cards, ratings and price recalculation.
   - Customer / Manufacturer / Admin roles.
   - Module settings, colors, handles and drawer presets.
   - Faucet / oven / fridge rules.
   - BOM / cost / production document engine.

## DEFERRED — next layer, do not overload R9.1

### Proposal comparison
Future optional comparison mode:
- Same kitchen across multiple manufacturers on one sheet.
- Alternative kitchen configurations from one manufacturer (e.g. L-shaped vs straight).
- User explicitly chooses what to add to comparison.
- This is recorded for the next layer and is not required for the current pilot.
