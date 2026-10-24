# BIZET OS 1.1 — PILOT r6

Owner correction package after r5 QA. Base: `build-1.1-d-config-first-pilot-r5`.

## 1. UX / navigation
- First screen: no back arrow in upper-left corner. This is a hard rule.
- Custom/manual room-geometry entry: keep the button visible as a future capability reminder, but disable the action for r6 because current behavior is not reliable enough.
- Global `…` menu must actually apply theme and language to the whole current page on every step, not only to the menu itself. English selection means all visible UI strings on that screen are English. Theme selection must update the entire page. Verify after step 4 and across the complete flow.
- Browser back/step-back must restore an interactive screen. No dead/disabled buttons after returning to a previous step. Verify Chrome and Safari/mobile lifecycle/history restoration.
- Configuration CTA text: replace misleading `Перейти в 3D`. Button text: `Выбрать бытовую технику`. Small helper below: `Далее`.
- Add a persistent `?` help button beside `…` on every screen. `?` = urgent/in-context live assistance (bot or employee implementation can come later). Keep `Обратная связь` in `…` as non-urgent feedback and keep `Как пользоваться системой` as the future instruction/help scenario.

## 2. Oven / cooktop
- If oven is selected in a lower cabinet, oven + cooktop are one module by default (normal case). Do not create separate cooktop and oven lower modules.
- Oven placement choices must include: lower module; tall unit; `Другое`.
- `Другое` is visible but disabled in r6; custom placement scenario is deferred.
- Preserve r5 tall-unit rules: refrigerator is outermost; if refrigerator and oven tall unit are on the same wall, refrigerator is outermost and oven tall unit immediately follows it; oven vertical position depends on additional tall appliances.

## 3. Sink / dish-drying cabinet
- Double-bowl sink must render as two bowls in 3D, not one.
- Straight double-bowl sink cabinet: minimum width 900 mm. System must not accept a smaller width.
- Straight sink cabinet maximum width: 900 mm. Corner sink scenarios are separate/deferred.
- Default facade division rule for straight base cabinets: width <= 600 mm = one full facade; width >= 650 mm = two facades. Manual facade customization is deferred.
- Directly above the sink, BIZET OS places a dedicated `Сушка для посуды` upper cabinet by default, not a generic upper cabinet.
- Dish-drying cabinet width equals sink cabinet width.
- Standard external widths for dish-drying cabinets: 500 / 600 / 700 / 800 / 900 mm. Maximum 900 mm. Non-standard requirement routes user to support/live engineer.

## 4. Module dimensional standards
Sequence before inter-row gap:
1. user chooses overall base-module height;
2. user chooses distance between base and upper modules;
3. user chooses overall upper-module height.
Depths of base and upper modules are also user-editable within limits. System shows defaults first.

### Base modules
- Minimum overall height = 850 mm INCLUDING worktop. Label must explicitly say the dimension includes worktop thickness.
- Minimum cabinet depth = 580 mm INCLUDING facade. Smaller values are rejected.
- With a standard 600 mm worktop this gives a 20 mm worktop overhang beyond the facade.
- User may increase base depth.

### Upper modules
- Minimum height = 550 mm across categories.
- Maximum height of one integral upper cabinet = 900 mm.
- If requested total upper-row height exceeds 900 mm, BIZET OS automatically splits the vertical composition and creates an upper/mezzanine row. Example 1350 = 900 + 450. The total requested composition may contain a secondary part below 550 because 550 is the minimum user-entered primary upper-module height, while the generated remainder is an automatic split.
- Upper-module depth range = 320–450 mm. Values outside the range are not accepted in self-service. If a client needs a larger/special value, route to support/live engineer.

### Tall units
- Tall-unit depth follows the selected base-module depth.
- Tall-unit overall height aligns with the full vertical composition: base height + selected gap + upper composition height.

## 5. Refrigerator
- Combined refrigerator/freezer with two fronts: lower refrigerator front height equals the height of neighboring base-module fronts.
- `Крайний` is a hard semantic rule across ALL configurations: outermost means the end of the selected run/leg, never the corner module.
- In L/U/multi-leg configurations, if refrigerator is specified outermost on a side, place it at the physical end of that leg. Do not put it into the internal corner.

## 6. Corner semantics
- `От угла` for a sink means the sink starts/is located in the corner zone. It is explicitly different from `крайний`.
- Corner module construction types will be specified later; do not assume trapezoidal corner geometry.
- Later manual module editing may move the sink; not part of this rule definition.

## 7. Worktop
- Category I / chipboard worktop: maximum single-piece length = 4080 mm.
- Any required run longer than 4080 mm must be split automatically into multiple worktop pieces and the joint line must be visible in 3D.

## 8. 3D module list
- The numbered module strip below 3D must remain usable when there are more modules than fit on screen.
- Implement finger/touch horizontal scrolling. Do not truncate inaccessible modules off-screen.

## 9. Manual module movement from 3D
- Module movement is only along the horizontal/run axis. Remove the second-axis movement control for this workflow.
- Do NOT drag modules directly with a finger.
- Tap a module -> popup/editor -> user enters horizontal displacement/coordinate (e.g. +100 mm right) -> `Подтвердить`.
- Only after confirmation does BIZET OS rebuild the 3D model.
- Rebuild must rebalance neighboring module widths/space while respecting all active min/max dimensional rules. If a requested shift cannot be satisfied within constraints, reject it with a clear explanation rather than creating invalid geometry.
- Other module-editing options may remain placeholders/deferred in r6.

## 10. Preserve from r5
Do not regress already approved r5 behavior: perspective 3D, rotation, pinch zoom, initial auto-fit, optional dishwasher and sink-proximity/side logic, automatic communications after generated 3D, tap-only X/Z communication correction, PDF construction map, window/radiator/curtain-recess rules, room-feature recalculation, ceiling/filler rules, and other approved details unless explicitly superseded above.

## Acceptance focus
Owner tests on phone as an ordinary client. r6 is accepted only if the existing approved r5 route remains intact and the corrections above are visible/functional without introducing regressions.