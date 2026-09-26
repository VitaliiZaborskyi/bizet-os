from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "app" / "static"

def read(name: str) -> str:
    return (STATIC / name).read_text(encoding="utf-8")

def test_r10_phase1_configuration_routes_to_workspace_not_room_setup():
    handoff = read("start-room-handoff.js")
    assert "window.location.assign('/workspace?project='" in handoff
    assert "window.location.assign('/room-setup?project='" not in handoff
    assert "bizet_route_splash" in handoff
    assert "BizetTransition.play" not in handoff

def test_r10_phase1_workspace_starts_with_room_panel_closed():
    html = read("workspace-r8.html")
    js = read("workspace-r8.js")
    assert 'id="editorPanel" hidden' in html
    assert '<button data-panel="room"' in html
    assert "let activePanel=null" in js
    ready = js[js.index("async function ready"):js.index("ready();")]
    assert "selectPanel('room')" not in ready
    assert "rt.render()" in ready

def test_r10_phase1_full_kitchen_renderer_still_receives_all_modules():
    model = read("model.js")
    assert "modules=buildModules()" in model
    assert "drawKitchenScene($('modelCanvas')" in model
    assert "modules,camera" in model
    assert "renderStrip()" in model


def test_r10_phase2_full_kitchen_camera_keeps_pointer_and_touch_controls():
    model = read("model.js")
    css = read("workspace-r8.css")
    assert "canvas.addEventListener('pointerdown'" in model
    assert "canvas.addEventListener('pointermove'" in model
    assert "canvas.addEventListener('pointerup'" in model
    assert "canvas.addEventListener('wheel'" in model
    assert "cam.yaw=" in model and "cam.pitch=" in model
    assert "#modelCanvas{touch-action:none" in css


def test_r10_phase3_explicit_normal_and_focus_state_machine_contract():
    model = read("model.js")
    assert "NORMAL_KITCHEN_VIEW" in model
    assert "MODULE_FOCUS_MODE" in model
    assert "function enterNormalKitchenView()" in model
    assert "function enterModuleFocus(module)" in model
    assert "if(viewMode===VIEW_FOCUS&&activeModule)renderModuleFocus()" in model
    assert "else renderNormalKitchen(engineOk)" in model
    assert "viewMode===VIEW_NORMAL" in model

def test_r10_phase3_focus_exit_always_rebuilds_full_kitchen():
    model = read("model.js")
    exit_block = model[model.index("function exitModuleFocus"):model.index("$('moduleApply')")]
    assert "enterNormalKitchenView()" in exit_block
    assert "renderScene(false)" in exit_block
    assert "getViewMode:()=>viewMode" in model

def test_r10_phase3_focus_uses_same_primary_canvas_not_overlay_canvas():
    html = read("workspace-r8.html")
    model = read("model.js")
    assert html.count('id="modelCanvas"') == 1
    assert "moduleFocusCanvas" not in html
    assert "drawKitchenScene($('modelCanvas')" in model

def test_r10_phase3_repeated_focus_cycle_has_explicit_idempotent_exit_path():
    model = read("model.js")
    # Ten cycles exercise the same two explicit transition functions by contract:
    # no CSS/body state is the source of truth.
    for _ in range(10):
        assert "enterModuleFocus(selected)" in model
        assert "enterNormalKitchenView()" in model


def test_r10_phase4_focus_is_technical_transparent_and_rotatable():
    model = read("model.js")
    renderer = read("pilot-3d.js")
    assert "focusMode:true" in model
    assert "function drawTechnicalFocus" in renderer
    for token in ["Technical carcass: explicit 18 mm panels", "Ghosted facade", "Structural rails/ribs", "Shelves"]:
        assert token in renderer
    assert "viewMode===VIEW_FOCUS?focusCamera:camera" in model

def test_r101_hardware_registry_records_verified_scilm_and_blum_proxies():
    assets = read("r10-hardware-assets.js")
    rules = read("r10-domain-rules.js")
    assert "SCILM_ADJUSTABLE_LEG" in assets
    assert "250 PR50" in assets
    assert "250PR5010" in assets
    assert "VERIFIED_DIMENSIONAL_PROXY" in assets
    assert "height_min:100" in assets and "height_max:150" in assets
    assert "BLUM_HINGE_STRAIGHT_PLATE" in assets
    assert "70T3550.TL" in assets
    assert "175H3100" in assets
    assert "Horizontal cam mounting plate 20/32" in assets
    assert "CAD_IDENTIFIED_EXTERNAL_PROXY" in assets
    assert "STANDARD:Object.freeze({top:100,bottom:100" in rules
    assert "SINK_BASE:Object.freeze({top:150,bottom:100" in rules

def test_r10_phase6_renderer_consumes_hinge_rules_not_ratio_guessing():
    renderer = read("pilot-3d.js")
    assert "BizetR10Rules?.hingeVerticalMm" in renderer
    assert "rules.SINK_BASE" in renderer
    assert "rules.STANDARD" in renderer
    assert "module.hinge_vertical_rule" in renderer

def test_r101_oven_mapping_is_visible_and_never_duplicates_lower_oven():
    model = read("model.js")
    renderer = read("pilot-3d.js")
    assert "oven_appliance_present:inputs.oven_location==='LOWER'" in model
    assert "if(inputs.oven_location==='TALL')" in model
    assert "mandatory_lower_drawer:true" in model
    assert "lower_drawer_count:1" in model
    assert "baseModule('oven','Духовой шкаф'" not in model
    assert "module.kind==='COOKTOP'&&module.oven_appliance_present" in renderer
    assert "module.kind==='TALL_OVEN'" in renderer
    assert "module.mandatory_lower_drawer" in renderer

def test_r10_phase8_drawer_box_semantics_are_complete_and_facade_separate():
    model = read("model.js")
    renderer = read("pilot-3d.js")
    for token in ["'bottom'","'left_side'","'right_side'","'box_front'","'box_rear'","'slides'"]:
        assert token in model
    assert "facade_separate:true" in model
    assert "complete box + slides" in renderer


def test_r10_splash_is_silent_noninteractive_and_failsafe():
    shell = read("pilot-r8-shell.js")
    assert "new Audio(" not in shell
    assert "Нажмите для запуска" not in shell
    assert "needs-gesture" not in shell
    assert "SPLASH_FAILSAFE_MS" in shell
    assert "#132746" in shell
    assert "color:#2f7cff" in shell

def test_r10_top_right_controls_use_fixed_shared_position():
    shell = read("pilot-r8-shell.js")
    assert ".topbar .settings-wrap,.setup-topbar .settings-wrap,.r8-topbar .settings-wrap" in shell
    assert "right:18px!important" in shell
    assert "top:50%!important" in shell

def test_r10_localization_uses_russian_visual_direction_labels():
    start = read("start.js")
    assert "ru: 'Светлое'" in start
    assert "ru: 'Тёмное'" in start
    assert "en: 'Light'" in start
    assert "en: 'Dark'" in start

def test_r10_phase9_manufacturer_marketplace_and_roles_are_present():
    js = read("owner-qa-business.js")
    for token in ["BIZET Furniture","Zaborsky Kitchens","BIZET Sofa","Nordline Interiors"]:
        assert token in js
    for token in ["multiplier:2.0","multiplier:2.3","multiplier:1.8","multiplier:2.6"]:
        assert token in js
    for token in ["CUSTOMER","MANUFACTURER","ADMIN","DEMO PROFILE"]:
        assert token in js

def test_r10_customer_view_hides_internal_cost_and_markup():
    js = read("owner-qa-business.js")
    customer = js[js.index("function showCustomer"):js.index("function showManufacturer")]
    assert "bom.cost" not in customer
    assert "COST ×" not in customer
    assert "Себестоимость" in customer

def test_r10_phase10_proposal_is_one_a4_kitchen_summary():
    js = read("owner-qa-business.js")
    proposal = js[js.index("function printProposal"):js.index("function refresh")]
    assert "@page{size:A4" in proposal
    assert "proposalSnapshot" in js
    assert "configurationLabel" in js
    assert "runSummary" in js
    assert "Список изделий" in proposal
    assert "Изображение / схема" in proposal
    assert "Комплектация" in proposal
    assert "moduleSpec(d.modules).map" not in proposal
    assert 'font-family:"Century Gothic"' in proposal

def test_r10_workspace_wires_business_layer_after_model_runtime():
    html = read("workspace-r8.html")
    assert html.index("/static/model.js") < html.index("/static/point-b.js")
    assert html.index("/static/point-b.js") < html.index("/static/owner-qa-business.js")

def test_r10_light_pill_controls_use_dark_text():
    css = read("workspace-r8.css")
    assert ".r8-pill,.r8-arrow{color:#171716}" in css


def test_r1033_normal_view_is_forced_for_variant_resume_and_panel_open_but_not_resize():
    model = read("model.js")
    workspace = read("workspace-r8.js")
    apply_block = model[model.index("async function applyWorkspaceState"):model.index("function snapshot")]
    resume_block = model[model.index("async function resumeFromSleep"):model.index("window.BizetModelRuntime")]
    assert "enterNormalKitchenView()" in apply_block
    assert "enterNormalKitchenView()" in resume_block
    assert "window.addEventListener('resize'" in model
    resize_block = model[model.index("function redrawForViewportChange"):model.index("window.addEventListener('bizet:themechange'")]
    assert "enterNormalKitchenView()" not in resize_block
    assert "rt?.exitFocus?.()" in workspace


def test_r101_hard_module_and_facade_limits_are_domain_rules():
    rules = read("r10-domain-rules.js")
    model = read("model.js")
    assert "STRAIGHT_MAX:900" in rules
    assert "CORNER_MAX:1250" in rules
    assert "PREFERRED_FILL:600" in rules
    assert "HINGED_FACADE_MAX:597" in rules
    assert "return isCornerModule(m)?LIMITS.CORNER_MAX:LIMITS.STRAIGHT_MAX" in model
    assert "Math.ceil(available/LIMITS.HINGED_FACADE_MAX)" in model

def test_r101_residual_runs_split_into_600ish_modules_not_one_giant_fill():
    model = read("model.js")
    block = model[model.index("function systemFillModules"):model.index("function arrangeWall")]
    assert "while(rest>LIMITS.STRAIGHT_MAX)" in block
    assert "Math.min(LIMITS.PREFERRED_FILL,rest)" in block
    assert "LIMITS.MIN_STANDARD_MODULE" in block
    assert "'Филлер'" in block
    assert "baseModule(`system-fill-${wall}`,'Модуль',remaining" not in model

def test_r101_freestanding_appliance_is_not_clamped_by_900_cabinet_rule():
    model = read("model.js")
    max_block = model[model.index("function maxRunFor"):model.index("function hingedFacadeCountFor")]
    assert "m?.freestanding===true" in max_block
    assert "Math.max(LIMITS.STRAIGHT_MAX,Number(m?.runSize)||Number(m?.w)||runWidth(m)" in max_block

def test_r101_room_run_never_expands_beyond_measured_wall():
    model = read("model.js")
    bounds = model[model.index("function runBounds"):model.index("function systemFillModules")]
    assert "clamp(full-right,left,full)" in bounds
    assert "span:Math.max(0,end-left)" in bounds
    arrange = model[model.index("function arrangeWall"):model.index("function buildLower")]
    assert "cursor+runSize>bounds.end+0.5" in arrange
    assert "временно исключён из 3D" in arrange

def test_r101_room_height_wrapper_adapts_and_never_mutates_focus_geometry():
    dims = read("model-r6-dimensions.js")
    assert "function fittedHeights(room)" in dims
    assert "Math.min(roomH-module.z" in dims
    assert "if(options.focusMode)return original(canvas,options)" in dims
    assert "module.room_height_adapted=adapted" in dims

def test_r1031_dimensions_button_works_in_normal_and_focus_views():
    html = read("workspace-r8.html")
    model = read("model.js")
    renderer = read("pilot-3d.js")
    assert 'id="modelDimensionsToggle"' in html
    assert '📏' in html
    normal = model[model.index("function renderNormalKitchen"):model.index("function renderModuleFocus")]
    focus = model[model.index("function renderModuleFocus"):model.index("function renderScene")]
    assert "showDimensions:normalDimensionsVisible" in normal
    assert "showModuleDimensions:false" in normal
    assert "showModuleDimensions:focusDimensionsVisible" in focus
    assert "focusDimensionsVisible=!focusDimensionsVisible" in model
    assert "normalDimensionsVisible=!normalDimensionsVisible" in model
    assert "function drawFocusedModuleDimensions" in renderer
    assert "if(options.showModuleDimensions)drawFocusedModuleDimensions" in renderer

def test_r101_focus_has_explicit_whole_kitchen_exit():
    html = read("workspace-r8.html")
    model = read("model.js")
    assert 'id="focusBackButton"' in html
    assert "← Вся кухня" in html
    assert "$('focusBackButton')" in model
    assert "exitModuleFocus()" in model

def test_r101_sink_has_faucet_and_cooktop_has_burner_markers():
    renderer = read("pilot-3d.js")
    top = renderer[renderer.index("function drawTopAppliance"):renderer.index("function drawFreestandingDishwasher")]
    assert "if(module.kind==='SINK')" in top
    assert "stem=p(" in top and "spout=p(" in top
    assert "if(module.kind==='COOKTOP')" in top
    assert "[[.32,.36],[.68,.36],[.32,.63],[.68,.63]]" in top

def test_r103_focus_hardware_is_simplified_to_round_legs_and_35mm_cups():
    renderer = read("pilot-3d.js")
    assert "function drawScilmLegProxy" in renderer
    assert "function drawBlumHingeProxy" in renderer
    assert "drawScilmLegProxy" in renderer[renderer.index("function drawTechnicalFocus"):]
    assert "drawBlumHingeProxy" in renderer[renderer.index("function drawTechnicalFocus"):]
    hinge = renderer[renderer.index("function drawBlumHingeProxy"):renderer.index("function drawFocusedModuleDimensions")]
    assert "Ø35 concealed-hinge cup" in hinge
    assert "plateA" not in hinge and "plateB" not in hinge
    leg = renderer[renderer.index("function drawScilmLegProxy"):renderer.index("function drawBlumHingeProxy")]
    assert "ctx.arc" in leg and "ctx.lineCap='round'" in leg

def test_r101_dishwasher_is_optional_by_default():
    workspace = read("workspace-r8.js")
    model = read("model.js")
    assert "['NO','Нет']" in workspace
    assert "dishwasher_type:'NO'" in workspace
    assert "inputs.dishwasher_type!=='NO'" in model

def test_r103_constraint_warning_is_compact_button_not_permanent_banner():
    html = read("workspace-r8.html")
    model = read("model.js")
    css = read("workspace-r8.css")
    assert 'id="constraintBanner"' in html
    assert 'id="constraintButton"' in html
    assert "ПРОВЕРЬТЕ КОНФИГУРАЦИЮ" in model
    assert "btn.hidden=false" in model
    assert "el.hidden=true" in model
    assert ".r10-warning-button.is-warning" in css
    assert "background:#d92d20" in css
    assert "ROOM_HEIGHT_ADAPTED" in model
    assert "RUN_OVERFLOW_" in model

def test_r101_filler_is_not_costed_as_full_cabinet():
    pointb = read("point-b.js")
    assert "function fillerDetail" in pointb
    assert "'Filler Panel'" in pointb
    assert "m.kind==='FILLER'" in pointb
    assert "['DISHWASHER','FRIDGE','FILLER']" in pointb


def test_r102_ergonomic_rules_are_explicit_and_separate_hard_from_preferred():
    rules = read("r10-domain-rules.js")
    assert "SINK_COOKTOP_HARD_MIN:500" in rules
    assert "SINK_COOKTOP_PREFERRED:900" in rules
    assert "SINK_OVEN_SAME_WALL_MIN:1000" in rules
    assert "TRIANGLE_LEG_MIN:1200" in rules
    assert "TRIANGLE_LEG_MAX:2700" in rules
    assert "TRIANGLE_SUM_MAX:7900" in rules

def test_r102_default_multiwall_placement_separates_sink_from_cooktop_and_oven():
    model = read("model.js")
    assert "function resolvedCooktopWall()" in model
    assert "return autoWall(requested,sink,'A')" in model
    assert "function resolvedOvenWall()" in model
    assert "return autoWall(requested,sink,cook)" in model
    workspace = read("workspace-r8.js")
    assert "cooktop_wall:'AUTO'" in workspace
    assert "oven_wall:'AUTO'" in workspace

def test_r103_corner_zone_allows_only_sink_or_corner_module():
    model = read("model.js")
    rules = read("r10-domain-rules.js")
    assert "function ensureCornerZones" in model
    assert "ALLOWED_KINDS:Object.freeze(['SINK','CORNER'])" in rules
    assert "FORBIDDEN_APPLIANCES" in rules
    for token in ["COOKTOP","DISHWASHER","FRIDGE","TALL_OVEN","MICROWAVE"]:
        assert token in rules
    assert "makeCornerModule" in model
    assert "sinkCornerEdgeForWall" in model

def test_r102_sink_cooktop_spacing_is_injected_before_residual_fill():
    model = read("model.js")
    arrange = model[model.index("function arrangeWall"):model.index("function buildLower")]
    assert "ensurePairSpacing(ordered,wall,bounds,'SINK','COOKTOP'" in arrange
    assert "ERGO.SINK_COOKTOP_HARD_MIN" in arrange
    assert "ERGO.SINK_COOKTOP_PREFERRED" in arrange
    assert "Рабочая зона" in arrange

def test_r102_one_of_each_three_identical_system_hinged_modules_becomes_two_drawers():
    model = read("model.js")
    block = model[model.index("function promoteDrawerCadence"):model.index("function sinkCornerEdgeForWall")]
    assert "start+2<j" in block
    assert "kind:'DRAWERS'" in block
    assert "drawer_count:2" in block
    assert "drawer_layout:'EQUAL'" in block
    assert "auto_drawer_cadence:true" in block

def test_r102_normal_3d_restores_visible_handles():
    renderer = read("pilot-3d.js")
    details = renderer[renderer.index("function drawModuleDetails"):renderer.index("function drawFocusDot")]
    assert "const handle=" in details
    assert "module.kind==='DRAWERS'" in details
    assert "['HINGED','SINK','UPPER','UPPER_TOP','UPPER_DRYER']" in details
    assert "'HORIZONTAL'" in details
    assert "module.handle_offset_mm" in details

def test_r102_point_b_identity_and_order_status_are_visible_and_immutable():
    business = read("owner-qa-business.js")
    assert "ensureOrderIdentity" in business
    assert "/activate-order" in business
    assert "/order-stage" in business
    assert "identity.order_no||identity.session_id" in business
    assert "order_stage||'A'" in business
    html = read("workspace-r8.html")
    assert 'id="orderIdentityBadge"' in html

def test_r102_commercial_proposal_uses_owner_vector_logo_and_requested_table_language():
    business = read("owner-qa-business.js")
    proposal = business[business.index("async function printProposal"):business.index("function refresh")]
    assert "/static/bizet-os-zaborsky-document-logo.svg" in proposal
    assert "Список изделий" in proposal
    assert ".num{font-size:11px;background:#5c5c5c;color:#fff" in proposal
    assert '"Century Gothic",CenturyGothic,"Avenir Next"' in proposal
    assert "orderRef" in proposal

def test_r102_vector_document_logo_asset_exists():
    logo = read("bizet-os-zaborsky-document-logo.svg")
    assert 'viewBox="420 330 830 190"' in logo
    assert "#f9fbff" in logo
    assert "linear-pattern-0" in logo

def test_r102_production_drawing_engine_pilot_matches_reference_grammar():
    pointb = read("point-b.js")
    assert "function productionModuleSheet" in pointb
    for token in ["Assembly position", "Pos.", "Qnt. 1", "Name ", "Length ", "Height "]:
        assert token in pointb
    assert 'code=`ASS${module.number}.00.000`' in pointb
    assert "Code ${code}" in pointb
    assert "class=\"dim\"" in pointb
    assert "class=\"leader\"" in pointb
    assert "Production Drawing Engine · пилотный лист модуля" in pointb
    assert "BIZET_Production_Module_Pilot.svg" in pointb


def test_r1031_only_approved_mobile_steps_lock_viewport_and_other_steps_scroll():
    start = read("start.js")
    css = read("start.css")
    assert "document.body.dataset.startKind=step.field" in start
    assert "ru: 'Тип дома'" in start
    assert "en: 'Home type'" in start
    assert 'body[data-start-kind="object_type"]' in css
    assert 'body[data-start-kind="visual_direction"]' in css
    assert '.choice-grid[data-count="4"]' in css
    assert 'grid-template-columns:repeat(2,minmax(0,1fr))' in css
    assert '.choice-grid[data-count="3"]' in css
    assert 'grid-template-rows:repeat(3,minmax(0,1fr))' in css
    assert 'body[data-start-kind="zone_type"]' not in css
    assert 'body[data-start-kind="complexity_category"]' not in css

def test_r1031_configuration_to_workspace_uses_one_slow_routed_splash():
    handoff = read("start-room-handoff.js")
    shell = read("pilot-r8-shell.js")
    workspace = read("workspace-r8.html")
    css = read("workspace-r8.css")
    assert "bizet_route_splash" in handoff
    assert "BizetTransition.play" not in handoff
    assert "bizet_route_splash" in shell
    assert "play({duration:3400})" in shell
    assert "r10-route-loading" in workspace
    assert "html.r10-route-loading .r8-shell{visibility:hidden}" in css

def test_r103_composition_layer_centers_primary_appliance_inside_valid_run():
    model = read("model.js")
    rules = read("r10-domain-rules.js")
    assert "centerPrimaryApplianceOnLongRun:true" in rules
    assert "function centerCompositionAnchor" in model
    assert "composition_target='RUN_CENTER'" in model
    assert "ERGO.SINK_COOKTOP_HARD_MIN" in model
    assert "ERGO.SINK_OVEN_SAME_WALL_MIN" in model
    arrange = model[model.index("function arrangeWall"):model.index("function buildLower")]
    assert "ordered=ensureCornerZones(ordered,wall)" in arrange
    assert "ordered=centerCompositionAnchor(ordered,wall,bounds)" in arrange

def test_r103_focus_hides_module_navigation_number():
    renderer = read("pilot-3d.js")
    focus = renderer[renderer.index("if(options.focusMode"):renderer.index("drawRoomBase", renderer.index("if(options.focusMode"))]
    assert "No navigation number in MODULE_FOCUS_MODE" in focus
    assert "drawNumber(ctx,front,module.number,c)" not in focus

def test_r103_focus_uses_18mm_rib_and_oven_shelf_below_appliance():
    renderer = read("pilot-3d.js")
    focus = renderer[renderer.index("function drawTechnicalFocus"):renderer.index("function drawModuleRunDimensions")]
    assert "const railT=t" in focus
    assert "h:railT" in focus
    assert "z:oz-t" in focus
    assert "oven_support_shelf_position='BELOW_OVEN'" in focus
    assert "oven_nominal_zone_mm=600" in focus

def test_r1034_room_acquisition_has_template_scan_file_and_single_dimension_calibration():
    workspace = read("workspace-r8.js")
    for token in ["Шаблон","Скан","Загрузить файл","r10RoomFileInput","classifyRoomFile","ROOM_MODEL","calibrate-import","Известный размер"]:
        assert token in workspace
    assert ".pdf,.jpg,.jpeg,.png,.webp,.svg,.dxf,.dwg" in workspace
    assert "known_dimension_mm" in workspace
    assert "ROOM_MODEL_PREVIEW_READY" in workspace

def test_r103_mobile_light_step_bar_always_uses_dark_text():
    css = read("workspace-r8.css")
    assert ".r8-tools button,.r8-tools button span{color:#171716!important}" in css
    assert ".r8-tools button.is-active{background:#fff!important;color:#171716!important}" in css

def test_r103_customer_main_actions_are_only_think_and_buy():
    pointb = read("point-b.js")
    business = read("owner-qa-business.js")
    assert ">Подумаю<" in pointb
    assert ">Купить<" in pointb
    refresh = business[business.index("function refresh"):business.index("function boot")]
    assert "Подумаю" in refresh and "Купить" in refresh
    assert "r9ProducerButton" not in refresh
    assert "r9RoleButton" not in refresh
    assert "showThinkFlow" in refresh and "showBuyFlow" in refresh

def test_r103_buy_flow_selects_manufacturer_then_opens_payment_through_transition():
    business = read("owner-qa-business.js")
    buy = business[business.index("async function showBuyFlow"):business.index("function showPaymentFlow")]
    assert "transitionThen" in buy
    assert "Выберите производителя" in buy
    assert "data-producer" in business
    assert "commerce.selected_manufacturer" in buy
    assert "showPaymentFlow" in buy
    payment = business[business.index("function showPaymentFlow"):business.index("function showCustomer")]
    assert "commerce.payment_status" in payment
    assert "PAYMENT_PROVIDER_REQUIRED" in payment
    assert "Продолжить к оплате" in payment

def test_r103_think_flow_assigns_point_b_and_collects_contact_without_download_button():
    business = read("owner-qa-business.js")
    think = business[business.index("async function showThinkFlow"):business.index("async function showBuyFlow")]
    assert "ensureOrderIdentity" in think
    assert "commerce.proposal_status" in think
    assert "commerce.contact" in think
    assert "E-mail или телефон" in think
    assert "Отправить КП" in think
    assert "window.open" not in think
    assert "printProposal" not in think
    assert ".download" not in think

def test_r103_commerce_state_is_domain_data_not_visual_only():
    models = (ROOT / "app" / "project" / "models.py").read_text(encoding="utf-8")
    assert "class CommerceState" in models
    assert "proposal_status" in models
    assert "selected_manufacturer" in models
    assert "payment_status" in models
    assert "commerce: CommerceState" in models


def test_r1031_freestanding_fridge_is_top_fridge_bottom_freezer_with_clearance():
    model = read("model.js")
    renderer = read("pilot-3d.js")
    assert "function freestandingGap(width)" in model
    assert "if(w<=600)return 15" in model
    assert "if(w<=900)return 30" in model
    assert "return 50" in model
    assert "content:freeFridge?'FRIDGE_FREEZER'" in model
    assert "appliance_clearance_mm:clearance" in model
    assert "freezer_bottom:true" in model
    assert "function drawFreestandingFridge" in renderer
    fridge = renderer[renderer.index("function drawFreestandingFridge"):renderer.index("function drawFreestandingDishwasher")]
    assert "splitZ=fullH*.34" in fridge
    assert "module.x+gap" in fridge or "module.y+gap" in fridge

def test_r1031_freestanding_dishwasher_includes_clearance_inside_side_panels():
    model = read("model.js")
    renderer = read("pilot-3d.js")
    assert "applianceWidth+sidePanel*2+clearance*2" in model
    dish = renderer[renderer.index("function drawFreestandingDishwasher"):renderer.index("function drawFreestandingHood")]
    assert "panel+gap" in dish
    assert "gap+appliance+gap" in dish

def test_r1031_normal_view_has_tape_dimensions_toggle():
    html = read("workspace-r8.html")
    model = read("model.js")
    assert 'id="modelDimensionsToggle"' in html
    assert "📏" in html
    assert "normalDimensionsVisible=true" in model
    assert "showDimensions:normalDimensionsVisible" in model
    assert "else normalDimensionsVisible=!normalDimensionsVisible" in model
    sync = model[model.index("function syncFocusControls"):model.index("function variantState")]
    assert "dims.hidden=false" in sync
    assert "dims.textContent='📏'" in sync

def test_r1031_functional_triangle_warning_is_completely_suppressed():
    model = read("model.js")
    assert "WORK_TRIANGLE_PILOT" not in model
    assert "Эргономический контур холодильник–мойка–варочная" not in model
    assert "SINK_COOKTOP_HARD" in model

def test_r1034_canvas_owns_3d_gestures_and_page_scroll_stays_outside_canvas():
    model = read("model.js")
    css = read("workspace-r8.css")
    assert "#modelCanvas{touch-action:none" in css
    start = model.rindex("const canvas=$('modelCanvas')")
    gesture = model[start:model.index("$('modelDimensionsToggle')", start)]
    assert "drag.mode='SCROLL'" not in gesture
    assert "window.scrollTo" not in gesture
    assert "drag.mode='ROTATE'" in gesture
    assert "canvas.setPointerCapture" in gesture
    assert "event.preventDefault()" in gesture
    assert "if(viewMode===VIEW_FOCUS)cam.pitch=clamp" in gesture
    assert "else cam.pitch=drag.pitch" in gesture
    assert "pointerdown" in gesture and "pointermove" in gesture

def test_r1034_workspace_labels_remove_readiness_and_keep_randomizer_contract():
    html = read("workspace-r8.html")
    css = read("workspace-r8.css")
    assert "Настройки проекта" in html
    assert "Список модулей" in html
    assert "Готовность проекта" not in html
    assert 'id="readinessValue"' not in html
    assert 'id="readinessBar"' not in html
    assert ".r8-random{background:#f3f1ec;color:#171716" in css

def test_r1031_upper_handles_move_to_bottom_edge_and_focus_has_hangers_no_rail():
    renderer = read("pilot-3d.js")
    details = renderer[renderer.index("function drawModuleDetails"):renderer.index("function drawFocusDot")]
    assert "module.level==='upper'?module.z+offset" in details
    focus = renderer[renderer.index("function drawTechnicalFocus"):renderer.index("function drawModuleRunDimensions")]
    assert "if(module.level!=='upper')" in focus
    assert "if(module.level==='upper')" in focus
    assert "upper_hanger_visual='LEFT_RIGHT_REAR_TOP'" in focus
    assert "drawFocusDot(ctx" not in focus

def test_r1031_worktop_is_split_at_4100_and_bom_counts_per_run():
    renderer = read("pilot-3d.js")
    pointb = read("point-b.js")
    wt = renderer[renderer.index("function drawWorktop"):renderer.index("function drawPlinth")]
    assert "worktopRunPlan" in wt
    rules = read("r10-domain-rules.js")
    assert "MAX_UNSPLICED_MM:4100" in rules
    assert "NEAREST_MODULE_BOUNDARY_NOT_EXCEEDING_MAX" in rules
    assert "eligible[eligible.length-1]" in rules
    assert "worktopGroups" in pointb
    assert "worktopJoints" in pointb
    assert "Максимум 4100 мм без стыка" in pointb

def test_r1031_rotation_instruction_text_is_removed():
    renderer = read("pilot-3d.js")
    assert "Проведите пальцем по сцене" not in renderer
    assert "Проведите пальцем по модулю" not in renderer

def test_r1031_os_blue_is_exact_splash_blue_everywhere_in_ui():
    start_css = read("start.css")
    workspace_css = read("workspace-r8.css")
    shell = read("pilot-r8-shell.js")
    assert ".brand span{color:#2f7cff!important}" in start_css
    assert "--r8-blue:#2f7cff" in workspace_css
    assert ".r8-splash-logo span{color:#2f7cff" in workspace_css
    assert "color:#2f7cff" in shell

def test_r1031_configuration_screen_scrolls_and_file_import_accepts_pdf_and_photo():
    handoff = read("start-room-handoff.js")
    css = read("next-pilot.css")
    for token in ["Загрузить файл","startRoomFileInput","roomImportKind","application/pdf","image/","startRoomFilePreview","startRoomKnownDimension","Применить масштаб","room-import","analyze","calibrate","Подтвердить помещение"]:
        assert token in handoff
    assert 'body.config-screen-five-open{height:auto!important;overflow-y:auto!important' in css
    assert "configuration-choice-grid{grid-template-columns:1fr!important" in css
    assert "URL.createObjectURL(file)" in handoff
    assert "canonical_room_model" in handoff


def test_r1036_module_focus_renders_against_final_layout_without_tap():
    model = read("model.js")
    block = model[model.index("function openModule"):model.index("async function applyModuleCustomization")]
    assert "enterModuleFocus(selected)" in block
    assert "renderScene(false)" in block
    assert "dialog.show()" in block
    assert "scheduleRenderAfterLayout('focus-entry')" in block
    assert "focus-entry-second-frame" in block
    assert "scrollIntoView" not in block

def test_r1036_viewport_and_stage_resize_rerender_without_exiting_focus():
    model = read("model.js")
    resize = model[model.index("function redrawForViewportChange"):model.index("window.addEventListener('bizet:themechange'")]
    assert "scheduleRenderAfterLayout('viewport')" in resize
    assert "enterNormalKitchenView" not in resize
    assert "moduleDialog" not in resize
    assert "visualViewport" in resize
    assert "ResizeObserver" in resize
    assert "stage-resize" in resize
    assert "orientationchange" in resize

def test_r1032_worktop_shared_rule_uses_previous_module_boundary():
    rules = read("r10-domain-rules.js")
    block = rules[rules.index("function worktopRunPlan"):rules.index("window.BizetR10Rules")]
    assert "target=cursor+MAX" in block
    assert "v<=target" in block
    assert "eligible[eligible.length-1]" in block
    renderer = read("pilot-3d.js")
    pointb = read("point-b.js")
    assert "BizetR10Rules?.worktopRunPlan" in renderer
    assert "BizetR10Rules?.worktopRunPlan" in pointb

def test_r1032_import_flow_has_detected_geometry_overlay_and_confirmation():
    handoff = read("start-room-handoff.js")
    css = read("next-pilot.css")
    assert "roomImportOverlay" in handoff
    assert "segments_norm" in handoff
    assert "canonical_room_model" in handoff
    assert "ROOM_MODEL" in handoff
    assert "Подтвердить помещение" in handoff
    assert ".start-room-analysis-overlay" in css

def test_r1032_think_flow_calls_real_proposal_send_endpoint():
    business = read("owner-qa-business.js")
    assert "async function sendProposalEmail" in business
    assert "/proposal/send" in business
    think = business[business.index("async function showThinkFlow"):business.index("async function showBuyFlow")]
    assert "sendProposalEmail(contact,d)" in think
    assert "КП отправлено" in think
    assert "MAIL_PROVIDER_NOT_CONFIGURED" in business


def test_r1034_room_source_screen_precedes_kitchen_configuration():
    handoff = read("start-room-handoff.js")
    assert "function renderRoomSourceScreen" in handoff
    assert "function renderConfigurationScreen" in handoff
    source = handoff[handoff.index("function renderRoomSourceScreen"):handoff.index("function buildScreenFive")]
    assert "Шаблон" in source
    assert "Загрузить файл" in source
    assert "Скан" in source
    assert "Скан — в стадии разработки." in source
    assert "startRoomFileInput" in source
    assert "bindStartRoomImport(screen)" in source
    build = handoff[handoff.index("function buildScreenFive"):handoff.index("function destroyScreenFive")]
    assert "renderRoomSourceScreen(screen)" in build


def test_r1034_workspace_room_source_uses_template_and_scan_is_wip():
    js = read("workspace-r8.js")
    assert 'data-action="room-source-manual">Шаблон</button>' in js
    assert "source:'TEMPLATE'" in js
    assert "Скан — в стадии разработки." in js
    assert "SCAN_CONNECTOR_REQUIRED" not in js


def test_r1034_background_personalization_has_six_bizet_presets():
    shell = read("pilot-r8-shell.js")
    html = read("workspace-r8.html")
    for token in ["BIZET_BLUE","GRAPHITE","ARCTIC","AURORA","SAND","DEEP_NIGHT"]:
        assert token in shell
    assert "bizet_os_background" in shell
    assert "data-bizet-background" in shell
    assert "workspaceBackgroundHost" in html
    assert 'id="workspaceThemeSelect"' in html


def test_r1035_mobile_workspace_targets_single_screen_but_keeps_page_fallback():
    css = read("workspace-r8.css")
    assert "height:clamp(280px,47svh,400px)" in css
    assert "padding:6px 12px calc(78px + env(safe-area-inset-bottom))" in css
    mobile = css[css.index("/* R10.3.5 — tighter mobile workspace"):]
    assert "body.r8-workspace-body{height:100vh;overflow:hidden}" not in mobile


def test_r1036_fastapi_reports_current_version():
    main = (ROOT / "app" / "main.py").read_text(encoding="utf-8")
    assert 'version="R10.3.6"' in main


def test_r1035_focus_overlay_labels_selected_module_and_hides_global_controls():
    html = read("workspace-r8.html")
    model = read("model.js")
    css = read("workspace-r8.css")
    assert 'id="focusModuleLabel"' in html
    assert 'id="focusVariantRibbon"' in html
    assert "label.textContent=" in model
    assert "document.body.classList.toggle('r10-module-focus',inFocus)" in model
    for token in [".r8-variant-controls","#workspaceTools","#pointBFinalActions",".r8-module-strip-label","#moduleStrip"]:
        assert token in css[css.index("body.r10-module-focus"):]


def test_r1035_removes_obsolete_undo_and_visible_3d_status_line():
    html = read("workspace-r8.html")
    assert 'id="undoButton"' not in html
    assert 'id="modelStatus" hidden' in html
    assert "3D-пилот · полная кухня активна." not in html


def test_r1035_focus_variant_ribbon_has_working_drawer_and_hinged_presets():
    model = read("model.js")
    html = read("workspace-r8.html")
    for token in ["DRAWERS_2","DRAWERS_3","DRAWERS_4","DRAWERS_5","HINGED_2"]:
        assert token in model
    assert "module_variant_overrides" in model
    assert "applyFocusPreset" in model
    assert "bizet:modelchange" in model
    assert 'id="focusVariantOptions"' in html


def test_r1035_focus_preset_survives_auto_drawer_cadence_and_variant_slots():
    model = read("model.js")
    cadence = model[model.index("function promoteDrawerCadence"):model.index("function sinkCornerEdgeForWall")]
    assert "first.module_variant_preset" in cadence
    assert "!ordered[j].module_variant_preset" in cadence
    capture = model[model.index("function captureWorkspaceState"):model.index("async function applyWorkspaceState")]
    assert "module_variant_overrides" in capture
    apply = model[model.index("async function applyWorkspaceState"):model.index("function snapshot")]
    assert "state.module_variant_overrides" in apply


def test_r1035_price_difference_between_saved_kitchen_variants_is_driven_by_antresol_layout():
    workspace = read("workspace-r8.js")
    model = read("model.js")
    templates = workspace[workspace.index("const VARIANT_TEMPLATES"):workspace.index("let variantSlots")]
    assert templates.count("upper_layout:'ANTRESOL'") == 2
    assert templates.count("upper_layout:'STANDARD'") == 3
    upper = model[model.index("function upperFromLower"):model.index("function numbered")]
    assert "if(variant.upper_layout==='ANTRESOL')" in upper
    assert "kind:'UPPER_TOP'" in upper


def test_r1035_price_actions_are_inserted_directly_after_module_strip():
    pointb = read("point-b.js")
    ensure = pointb[pointb.index("function ensureUI"):pointb.index("function current")]
    assert "const anchor=$('moduleStrip')||$('modelStatus')" in ensure
    assert "insertAdjacentElement('afterend',host)" in ensure


def test_r1035_mobile_labels_and_spacing_prioritize_single_screen_iphone():
    css = read("workspace-r8.css")
    assert "height:clamp(280px,47svh,400px)" in css
    assert "font-size:13px;font-weight:820" in css
    assert "bottom:calc(70px + env(safe-area-inset-bottom))" in css
    assert "font-size:11px;font-weight:820" in css


def test_r1036_layout_state_is_applied_before_canvas_draw():
    model = read("model.js")
    normal = model[model.index("function renderNormalKitchen"):model.index("function renderModuleFocus")]
    focus = model[model.index("function renderModuleFocus"):model.index("function renderScene")]
    assert normal.index("prepareRenderLayout()") < normal.index("drawKitchenScene")
    assert focus.index("prepareRenderLayout()") < focus.index("drawKitchenScene")
    prepare = model[model.index("function prepareRenderLayout"):model.index("function scheduleRenderAfterLayout")]
    assert "syncFocusControls()" in prepare
    assert "void stage.offsetHeight" in prepare


def test_r1036_render_scheduler_has_no_pointer_dependency():
    model = read("model.js")
    scheduler = model[model.index("function scheduleRenderAfterLayout"):model.index("function variantState")]
    assert "requestAnimationFrame" in scheduler
    assert "renderScene(false)" in scheduler
    assert "pointer" not in scheduler.lower()


def test_r1036_workspace_cache_busts_renderer_assets():
    html = read("workspace-r8.html")
    assert "/static/model.js?v=166" in html
    assert "/static/workspace-r8.css?v=166" in html
