from pathlib import Path
import shutil
import subprocess
import pytest

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
    assert "surface.addEventListener('pointerdown'" in model
    assert "surface.addEventListener('pointermove'" in model
    assert "surface.addEventListener('pointerup'" in model
    assert "surface.addEventListener('wheel'" in model
    assert "bindCanvasSurface(normalCanvas)" in model
    assert "bindCanvasSurface(focusCanvas)" in model
    assert "cam.yaw=" in model and "cam.pitch=" in model
    assert "#modelCanvas,#focusCanvas{touch-action:none" in css


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
    assert "const lowerOven=inputs.oven_location==='LOWER'" in model
    assert "oven_appliance_present:lowerOven" in model
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

def test_r1042_focus_has_short_back_exit():
    html = read("workspace-r8.html")
    model = read("model.js")
    assert 'id="focusBackButton"' in html
    assert "← Назад" in html
    assert "← Вся кухня" not in html
    assert "← Back" in model
    assert "$('focusBackButton')" in model
    assert "exitModuleFocus()" in model

def test_r101_sink_has_faucet_and_cooktop_has_burner_markers():
    renderer = read("pilot-3d.js")
    top = renderer[renderer.index("function drawTopAppliance"):renderer.index("function drawFreestandingDishwasher")]
    assert "if(module.kind==='SINK')" in top
    assert "stem=p(" in top and "spout=p(" in top
    assert "if(module.kind==='COOKTOP')" in top
    assert "[[.32,.36],[.68,.36],[.32,.63],[.68,.63]]" in top

def test_r1041_focus_hardware_scales_with_model_and_uses_compact_square_legs():
    renderer = read("pilot-3d.js")
    assert "function drawScilmLegProxy" in renderer
    assert "function drawBlumHingeProxy" in renderer
    leg = renderer[renderer.index("function drawScilmLegProxy"):renderer.index("function drawBlumHingeProxy")]
    assert "drawBox(ctx,projector" in leg
    assert "size=22" in leg and "stem=8" in leg
    assert "ctx.arc" not in leg
    hinge = renderer[renderer.index("function drawBlumHingeProxy"):renderer.index("function drawFocusedModuleDimensions")]
    assert "cupX+17.5" in hinge
    assert "Math.hypot(edge[0]-cup[0],edge[1]-cup[1])" in hinge
    assert "Ø35 is projected from model space" in hinge

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

def test_r1040_filler_is_not_costed_as_full_cabinet_and_has_two_constructions():
    pointb = read("point-b.js")
    assert "function fillerDetail" in pointb
    assert "'Filler Flat'" in pointb
    assert "'Filler Front'" in pointb
    assert "'Filler Return'" in pointb
    assert "module.filler_shape==='L_SHAPE'" in pointb
    assert "module.filler_material==='FACADE'" in pointb
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


def test_r1039_unapproved_start_choices_follow_one_screen_grid_grammar():
    start = read("start.js")
    css = read("start.css")
    next_css = read("next-pilot.css")
    assert "document.body.dataset.startKind=step.field" in start
    assert "ru: 'Тип дома'" in start
    assert "en: 'Home type'" in start
    assert 'body[data-start-kind="object_type"]' in css
    assert 'body[data-start-kind="visual_direction"]' in css
    assert 'body[data-start-kind="product_type"]' in css
    assert 'body[data-start-kind="complexity_category"]' in css
    assert "step.field === 'product_type' && option.value === 'ZONE_OTHER'" in start
    assert "step.field === 'complexity_category' && option.value === 'V'" in start
    assert "r1039-wide-choice" in start
    assert "grid-template-columns:repeat(2,minmax(0,1fr))" in next_css
    assert "grid-template-rows:repeat(2,minmax(0,1fr)) 48px" in next_css
    assert "background:#2f7cff!important" in next_css

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

def test_r1042_customer_main_actions_are_offer_and_buy():
    pointb = read("point-b.js")
    business = read("owner-qa-business.js")
    assert ">Скачать предложение<" in pointb
    assert ">Купить<" in pointb
    refresh = business[business.index("function refresh"):business.index("function boot")]
    assert "Скачать предложение" in refresh and "'OFFER'" in refresh and "Купить" in refresh
    assert "Сохранить проект" not in refresh and "Подумаю" not in refresh
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

def test_r1042_offer_flow_selects_documents_downloads_sends_and_has_whatsapp():
    business = read("owner-qa-business.js")
    flow = business[business.index("async function showThinkFlow"):business.index("async function showBuyFlow")]
    assert "ensureOrderIdentity" in flow
    assert "commerce.proposal_status" in flow
    assert 'id="r104OfferProposal"' in flow
    assert 'id="r104OfferApproval"' in flow
    assert 'id="r104OfferDownload"' in flow
    assert 'id="r104OfferSend"' in flow
    assert "downloadOfferDocument('proposal',d)" in flow
    assert "downloadOfferDocument('approval',d)" in flow
    assert "sendProposalEmail" in flow
    assert "wa.me/380974587676" in flow

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
    assert "#modelCanvas,#focusCanvas{touch-action:none" in css
    start = model.rindex("const normalCanvas=$('modelCanvas'),focusCanvas=$('focusCanvas');")
    gesture = model[start:model.index("$('modelDimensionsToggle')", start)]
    assert "drag.mode='SCROLL'" not in gesture
    assert "window.scrollTo" not in gesture
    assert "drag.mode='ROTATE'" in gesture
    assert "surface.setPointerCapture" in gesture
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
    assert "module.level==='upper'?module.z+40:module.z+module.h-40" in details
    focus = renderer[renderer.index("function drawTechnicalFocus"):renderer.index("function drawModuleRunDimensions")]
    assert "if(module.level!=='upper')" in focus
    assert "if(module.level==='upper')" in focus
    assert "'LEFT_RIGHT_REAR_TOP'" in focus
    assert "'DOUBLE_SET_LEFT_RIGHT_REAR'" in focus
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

def test_r1039_configuration_is_one_screen_2x3_plus_disabled_custom_and_keeps_file_import():
    handoff = read("start-room-handoff.js")
    css = read("next-pilot.css")
    for token in ["Загрузить файл","startRoomFileInput","roomImportKind","application/pdf","image/","startRoomFilePreview","startRoomKnownDimension","Применить масштаб","room-import","analyze","calibrate","Подтвердить помещение"]:
        assert token in handoff
    assert "CONFIGS.filter(config=>config.code!=='CUSTOM')" in handoff
    assert 'class="configuration-choice-card configuration-custom-choice"' in handoff
    assert "Своя конфигурация · скоро" in handoff
    assert "custom.disabled=true" in handoff
    assert 'body[data-start-kind="configuration"].config-screen-five-open' in css
    assert "grid-template-columns:repeat(2,minmax(0,1fr))!important" in css
    assert "grid-template-rows:repeat(3,minmax(0,1fr)) 44px!important" in css
    assert "overflow:hidden!important" in css
    assert "URL.createObjectURL(file)" in handoff
    assert "canonical_room_model" in handoff


def test_r1041_module_focus_enters_with_editor_before_single_frame_render():
    model = read("model.js")
    block = model[model.index("function openModule"):model.index("async function applyModuleCustomization")]
    assert "enterModuleFocus(selected)" in block
    assert "renderModuleEditor(selected)" in block
    assert "renderFocusModuleMenu()" in block
    assert "commitFocusTransition(selected.id)" in block
    assert "dialog.show()" not in block
    assert "showModal" not in block
    assert "runFocusPaintBurst" not in block
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

def test_r1042_offer_flow_calls_real_proposal_send_endpoint():
    business = read("owner-qa-business.js")
    assert "async function sendProposalEmail" in business
    assert "/proposal/send" in business
    offer = business[business.index("async function showThinkFlow"):business.index("async function showBuyFlow")]
    assert "sendProposalEmail(ct.email,d" in offer
    assert "Документы отправлены" in offer
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


def test_r1049_fastapi_reports_current_version():
    main = (ROOT / "app" / "main.py").read_text(encoding="utf-8")
    assert 'version="R10.4.9"' in main


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


def test_r1045_workspace_cache_busts_renderer_assets():
    html = read("workspace-r8.html")
    assert "/static/model.js?v=175" in html
    assert "/static/pilot-3d.js?v=175" in html
    assert "/static/workspace-r8.css?v=175" in html
    assert "/static/model-r5.js?v=175" in html
    assert "/static/workspace-r8.js?v=175" in html
    assert "/static/point-b.js?v=175" in html


def test_r1037_focus_transition_forces_new_canvas_backing_store():
    renderer = read("pilot-3d.js")
    setup = renderer[renderer.index("function setupCanvas"):renderer.index("const add=")]
    assert "forceReset=false" in setup
    assert "canvas.width=1;canvas.height=1" in setup
    assert "void canvas.offsetWidth" in setup
    assert "canvas.width=targetWidth;canvas.height=targetHeight" in setup
    kitchen = renderer[renderer.index("function drawKitchenScene"):renderer.index("window.BizetPilot3D")]
    assert "options.forceCanvasReset===true" in kitchen
    assert "flushCanvas(ctx,forceCanvasReset)" in kitchen


def test_r1041_focus_entry_uses_one_deferred_commit_not_paint_burst():
    model = read("model.js")
    commit = model[model.index("function commitFocusTransition"):model.index("function setValidation")]
    assert "requestAnimationFrame" in commit
    assert "renderScene(false)" in commit
    assert "renderModuleEditor(activeModule)" in commit
    assert "runFocusPaintBurst" not in model
    assert "[70,160,280]" not in model


def test_r1037_focus_renderer_consumes_hard_reset_frames():
    model = read("model.js")
    focus = model[model.index("function renderModuleFocus"):model.index("function renderScene")]
    assert "focusCanvasResetFrames>0" in focus
    assert "focusCanvasResetFrames--" in focus
    assert "forceCanvasReset" in focus
    enter = model[model.index("function enterNormalKitchenView"):model.index("function sinkWall")]
    assert "focusCanvasResetFrames=1" in enter
    assert "focusPaintToken++" in enter


def test_r1037_webkit_canvas_has_dedicated_compositor_layer():
    css = read("workspace-r8.css")
    assert "-webkit-transform:translateZ(0)" in css
    assert "-webkit-backface-visibility:hidden" in css


def test_r1038_has_dedicated_focus_canvas_surface():
    html = read("workspace-r8.html")
    css = read("workspace-r8.css")
    model = read("model.js")
    assert 'id="modelCanvas"' in html
    assert 'id="focusCanvas"' in html
    assert "r10-focus-canvas" in html
    assert "body.r10-module-focus .r10-kitchen-canvas" in css
    assert "body.r10-module-focus .r10-focus-canvas" in css
    focus = model[model.index("function renderModuleFocus"):model.index("function renderScene")]
    assert "drawKitchenScene($('focusCanvas')" in focus
    normal = model[model.index("function renderNormalKitchen"):model.index("function renderModuleFocus")]
    assert "drawKitchenScene($('modelCanvas')" in normal


def test_r1038_only_active_canvas_owns_gestures():
    model = read("model.js")
    start = model.rindex("const normalCanvas=$('modelCanvas'),focusCanvas=$('focusCanvas');")
    block = model[start:model.index("$('focusVariantOptions')", start)]
    assert "function activeCanvas()" in block
    assert "surface!==activeCanvas()" in block
    assert "bindCanvasSurface(normalCanvas)" in block
    assert "bindCanvasSurface(focusCanvas)" in block
    assert "surface===normalCanvas" in block
    assert "requestAnimationFrame(()=>openModule(id))" in block


def test_r1038_focus_canvas_has_same_touch_and_pinch_contract():
    css = read("workspace-r8.css")
    bridge = read("model-r5.js")
    assert "#modelCanvas,#focusCanvas{touch-action:none" in css
    assert "focusCanvas=document.getElementById('focusCanvas')" in bridge
    assert "canvasSet=new Set([canvas,focusCanvas].filter(Boolean))" in bridge
    assert "pinchSurface?.dispatchEvent(new WheelEvent('wheel'" in bridge


def test_r1044_start_assets_are_cache_busted():
    html = read("index.html")
    assert "/static/start.css?v=1049" in html
    assert "/static/next-pilot.css?v=1049" in html
    assert "/static/start.js?v=1049" in html
    assert "/static/start-room-handoff.js?v=1049" in html
    assert "/static/next-pilot-start.js?v=1049" in html


def test_r1039_checkpoint_keeps_critical_isolation_bug_and_dual_ux_shells_visible():
    checkpoint = (ROOT / "R10_4_0_MUST_HAVE_CHECKPOINT.md").read_text(encoding="utf-8")
    assert "CRITICAL — iPhone module isolation / 3D autoregeneration" in checkpoint
    assert "still NOT resolved" in checkpoint
    assert "MOBILE_WORKSPACE" in checkpoint
    assert "DESKTOP_WORKSPACE" in checkpoint
    assert "one engineering core" in checkpoint.lower()


def test_r1040_isolation_has_integrated_draft_editor_and_explicit_save():
    html = read("workspace-r8.html")
    model = read("model.js")
    for token in ['id="moduleEditPanel"', 'id="moduleEditBody"', 'id="moduleDraftPrice"', 'id="moduleEditSave"', 'id="moduleEditCancel"']:
        assert token in html
    assert "let moduleDraft=null" in model
    assert "function renderModuleEditor" in model
    assert "function saveModuleDraft" in model
    assert "module_edit_overrides" in model
    assert "R10.4.5_MODULE_SAVED" in model


def test_r1040_hinged_and_drawer_width_rules_are_hard_in_editor():
    model = read("model.js")
    validator = model[model.index("function validateModuleDraft"):model.index("function editField")]
    assert "1 распашной фасад: ширина модуля 150–600 мм." in validator
    assert "2 распашных фасада: ширина модуля 600–900 мм." in validator
    assert "3 распашных фасада допускаются только при ширине 900 мм." in validator
    assert "Модуль с ящиками: ширина только 300–900 мм." in validator
    assert "Количество ящиков: от 2 до 5." in validator
    assert "visibleTallDrawerLimit()" in validator


def test_r1040_drawer_box_height_is_facade_minus_exactly_50_mm_in_bom_and_focus_3d():
    pointb = read("point-b.js")
    renderer = read("pilot-3d.js")
    assert "drawerH=Math.max(1,round(facadeH-50))" in pointb
    assert "boxH=Math.max(1,facadeH-50)" in renderer
    assert "HARD rule: box height = facade height minus exactly 50 mm." in renderer


def test_r1040_middle_side_follows_internal_hinge_boundaries():
    model = read("model.js")
    renderer = read("pilot-3d.js")
    pointb = read("point-b.js")
    assert "function middleSideBoundaries" in model
    assert "normalized[i]==='RIGHT'||normalized[i+1]==='LEFT'" in model
    assert "module.middle_side_boundaries" in renderer
    assert "Middle Side" in pointb


def test_r1040_shelves_drive_geometry_and_bom_hardware():
    model = read("model.js")
    pointb = read("point-b.js")
    renderer = read("pilot-3d.js")
    assert "shelf_count" in model and "shelf_type" in model
    assert "Регулируемая полка; полкодержатели" in pointb
    assert "Жёсткая полка; крепление к бокам" in pointb
    assert "H.SHELF_SUPPORT" in pointb
    assert "fixedFasteners" in pointb
    assert "const maxShelves=module.tall?3:2" in renderer


def test_r1040_ordinary_lower_has_two_ribs_and_upper_has_no_generic_ribs():
    renderer = read("pilot-3d.js")
    pointb = read("point-b.js")
    focus = renderer[renderer.index("R10.4.0: ordinary lower carcasses"):renderer.index("// Shelves:")]
    assert "y:y+26" in focus
    assert "y:y+d-70" in focus
    assert "module.level!=='upper'" in focus
    ordinary = pointb[pointb.index("function ordinaryBase"):pointb.index("function sinkBase")]
    assert "'Rail Front'" in ordinary
    assert "'Rail Back'" in ordinary
    upper = pointb[pointb.index("function upper(module"):pointb.index("function tall(")]
    assert "'Rail Front'" not in upper
    assert "'Rail Back'" not in upper


def test_r1045_plinth_variant_a_preserves_selected_lower_total_height_and_recalculates_bom():
    model = read("model.js")
    pointb = read("point-b.js")
    workspace = read("workspace-r8.js")
    assert "DEFAULT_LOWER_TOTAL_H=900" in model
    assert "function lowerTotalHeight()" in model
    assert "lowerBodyHeight(){return Math.max(300,lowerTotalHeight()-plinthHeight()-WORKTOP_H)}" in model
    assert "visibleTallDrawerLimit(){return lowerTotalHeight()-WORKTOP_H}" in model
    assert "plinth_height_mm:100" in workspace
    assert "lower_total_height_mm:900" in workspace
    assert "areas.PLINTH" in pointb
    assert "Ножка H " in pointb
    assert "legHeight" in pointb


def test_r1040_room_and_furniture_material_picker_has_presets_and_upload():
    html = read("workspace-r8.html")
    workspace = read("workspace-r8.js")
    renderer = read("pilot-3d.js")
    for token in ['id="surfaceMaterialDialog"', 'id="surfaceTextureInput"', 'id="surfaceMaterialSwatches"']:
        assert token in html
    for token in ["const MATERIAL_LIBRARY", "TILE", "PARQUET", "MICROCEMENT", "facade:{", "carcass:{", "worktop:{", "FileReader", "custom_texture_data_url"]:
        assert token in workspace
    assert "document.documentElement.dataset.floorPreset" in renderer
    assert "facadeMap" in renderer
    assert "worktopMap" in renderer


def test_r1040_module_price_excludes_whole_kitchen_worktop_and_is_live_in_editor():
    pointb = read("point-b.js")
    model = read("model.js")
    assert "function modulePrice(module)" in pointb
    assert "includeWorktop:false" in pointb
    assert "modulePrice" in pointb[pointb.index("window.BizetPointB="):]
    assert "function refreshModuleDraftPrice" in model
    assert "moduleDraftPrice" in model
    assert "moduleDraftDelta" in model


def test_r1040_mobile_reclaims_blank_area_and_restores_project_settings_label():
    css = read("workspace-r8.css")
    block = css[css.index("/* R10.4.0 — integrated module editor"):]
    assert ".r8-stage{height:clamp(350px,58svh,520px)" in block
    assert ".r8-tools-label" in block
    assert "position:absolute!important" in block
    assert "top:5px!important" in block
    assert "screenYOffset" in read("model.js")


def test_r1040_removes_literal_newline_artifacts_from_workspace_and_room_html():
    assert "\\n" not in read("workspace-r8.html")
    assert "\\n" not in read("room.html")


def test_r1040_proposal_reserves_large_visualization_area_and_renderer_hook():
    business = read("owner-qa-business.js")
    assert "visualization_render_url" in business
    assert "ENGINEERING_PREVIEW" in business
    assert "height:88mm" in business
    assert "price-hero" in business
    assert "фотореалистичный рендер подключается отдельным визуализатором" in business


def test_r1040_tall_appliance_logic_remains_frozen_until_module_library():
    pointb = read("point-b.js")
    assert "appliance tall cabinet remains on the frozen pre-library logic" in pointb
    model = read("model.js")
    classifier = model[model.index("function moduleEditorKind"):model.index("function draftFromModule")]
    assert "TALL_OVEN" in classifier
    assert "TALL_PLAIN" in classifier


def test_r1040_javascript_syntax_when_node_is_available():
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not available in this test environment")
    for name in ["model.js", "pilot-3d.js", "point-b.js", "workspace-r8.js", "owner-qa-business.js"]:
        path = STATIC / name
        result = subprocess.run([node, "--check", str(path)], capture_output=True, text=True)
        assert result.returncode == 0, f"{name}: {result.stderr}"


def test_r1041_english_module_names_use_base_cabinet_and_keep_mezzanine_separate():
    model = read("model.js")
    assert "if(m.kind==='HINGED')" in model
    assert "'Base cabinet'" in model
    assert "'Drawer base cabinet" in model
    assert "if(m.kind==='UPPER_TOP')return 'Mezzanine cabinet'" in model
    assert "top.push({...m,id:'top-'+m.id,label:'Антресоль',kind:'UPPER_TOP'" in model


def test_r1041_focus_navigation_has_dropdown_and_prev_next_arrows():
    html = read("workspace-r8.html")
    model = read("model.js")
    for token in ['id="focusPrevModule"', 'id="focusModuleLabel"', 'id="focusNextModule"', 'id="focusModuleMenu"']:
        assert token in html
    assert "function focusModuleOrder" in model
    assert "function renderFocusModuleMenu" in model
    assert "function switchFocusModule" in model
    assert "data-focus-module" in model


def test_r1041_number_toggle_disables_full_kitchen_badges():
    html = read("workspace-r8.html")
    model = read("model.js")
    renderer = read("pilot-3d.js")
    assert 'id="moduleNumbersToggle"' in html
    assert "NUMBERS_KEY='bizet_os_show_module_numbers'" in model
    assert "showNumbers:showModuleNumbers" in model
    assert "if(options.showNumbers!==false)drawNumber" in renderer


def test_r1041_touch_selection_has_phone_tolerance_and_focus_page_does_not_scroll():
    model = read("model.js")
    css = read("workspace-r8.css")
    move = model[model.index("function moveCanvasGesture"):model.index("function endCanvasGesture")]
    assert "drag.pointerType==='touch'?14:5" in move
    end = model[model.index("function endCanvasGesture"):model.index("function bindCanvasSurface")]
    assert "requestAnimationFrame(()=>openModule(id))" in end
    focus_css = css[css.index("/* R10.4.1 — stable focus UX"):]
    assert "body.r10-module-focus" in focus_css
    assert "overflow:hidden!important" in focus_css
    assert ".r104-module-editor" in focus_css
    assert "overflow-y:auto" in focus_css


def test_r1041_handles_keep_40mm_clearance_to_nearest_edge():
    renderer = read("pilot-3d.js")
    details = renderer[renderer.index("function drawModuleDetails"):renderer.index("function drawFocusDot")]
    assert "offset=Math.max(40" in details
    assert "edgeGap=40+len/2" in details
    assert "module.z+40" in details
    assert "module.z+module.h-40" in details


def test_r1041_renderer_depth_sorts_box_faces_and_hit_test_prefers_nearest_face_center():
    renderer = read("pilot-3d.js")
    box = renderer[renderer.index("function drawBox"):renderer.index("function faceCenter")]
    assert "avgDepth" in box
    assert ".sort((a,b)=>avgDepth(b.face)-avgDepth(a.face)" in box
    kitchen = renderer[renderer.index("function drawKitchenScene"):renderer.index("window.BizetPilot3D")]
    assert "candidates=hits.filter" in kitchen
    assert "Math.hypot(ac[0]-x,ac[1]-y)" in kitchen


def test_r1041_order_reference_expands_year_to_avoid_day_month_confusion():
    business = read("owner-qa-business.js")
    identity = business[business.index("const identityRef"):business.index("function updateIdentityBadge")]
    assert "match[3]" in identity
    assert "20" in identity
    assert "match[4]" in identity


def test_r1041_workspace_chrome_translation_is_centralized():
    workspace = read("workspace-r8.js")
    model = read("model.js")
    assert "function localizeWorkspaceChrome" in workspace
    assert "Project settings" in workspace
    assert "Module list" in workspace
    assert "Another variant" in workspace
    assert "const tr=(ru,en)" in model
    assert "displayModuleName:moduleDisplayName" in model

def test_r1042_complexity_fifth_choice_is_named_custom_configuration():
    start = read('start.js')
    assert "{ value: 'V', title: { ru: 'Своя конфигурация', en: 'Custom configuration' }" in start
    assert "V: { ru: 'Своя конфигурация', en: 'Custom configuration' }" in start


def test_r1042_room_source_flow_has_no_continue_to_configuration_copy():
    combined = '\n'.join([read('workspace-r8.js'), read('room-r8.js'), read('room-v2.js'), read('room-latest.js'), read('start-room-handoff.js')])
    assert 'Continue to configuration' not in combined
    assert 'Продолжить к конфигурации' not in combined
    assert 'startRoomSourceContinue' not in read('start-room-handoff.js')


def test_r1042_oven_width_is_hard_600_or_900_in_project_and_focus_editor():
    workspace = read('workspace-r8.js')
    model = read('model.js')
    assert "field('Ширина духовки','oven_width_mm',[[600,'600 мм'],[900,'900 мм']])" in workspace
    assert "oven_width_mm:600" in workspace
    editor = model[model.index('function renderModuleEditor'):model.index('function readModuleEditor')]
    assert 'Ширина духовки, мм' in editor
    assert "[[600,'600'],[900,'900']]" in editor
    validator = model[model.index('function validateModuleDraft'):model.index('function editField')]
    assert '![600,900].includes(run)' in validator


def test_r1042_two_finger_pan_keeps_pinch_zoom_and_centers_camera_on_kitchen():
    bridge = read('model-r5.js')
    model = read('model.js')
    renderer = read('pilot-3d.js')
    assert 'bizet:canvaspan' in bridge
    assert 'center=()' in bridge
    assert "WheelEvent('wheel'" in bridge
    assert "document.addEventListener('bizet:canvaspan'" in model
    assert "drag.mode='PAN'" in model and "drag.mode='ZOOM'" in model
    assert 'function kitchenCameraTarget' in model
    assert 'targetX:target?.x' in model and 'targetY:target?.y' in model and 'targetZ:target?.z' in model
    projector = renderer[renderer.index('function createProjector'):renderer.index('function colors')]
    assert 'cameraOverride.targetX' in projector
    assert 'screenXOffset' in projector


def test_r1044_currency_selector_uses_nbu_rates_and_is_not_in_isolation():
    html = read('workspace-r8.html')
    workspace = read('workspace-r8.js')
    model = read('model.js')
    pointb = read('point-b.js')
    routes = (ROOT / 'app' / 'api' / 'routes_v11.py').read_text(encoding='utf-8')
    assert 'id="moduleCurrencySelect"' not in html
    assert 'moduleCurrencySelect' not in model
    assert 'id="projectCurrencySelect"' in pointb
    for code in ['UAH','EUR','USD','AUD']:
        assert f'<option value="{code}">{code}</option>' in pointb
    assert "display_currency:'UAH'" in workspace
    assert '/api/v1.1/fx-rates' in pointb
    assert 'formatMoney' in pointb and 'convertMoney' in pointb
    assert '@router.get("/fx-rates")' in routes
    assert 'bank.gov.ua/NBUStatService' in routes


def test_r1042_project_settings_have_general_section_and_central_translation():
    html = read('workspace-r8.html')
    workspace = read('workspace-r8.js')
    assert '<button data-panel="general" type="button"><span>07</span>Общие</button>' in html
    assert 'const PROJECT_I18N=' in workspace
    for token in ['How to define the room','Room surfaces','Additional appliance settings','Integrated hood type','Required utility points','Wall elements','Furniture materials','Handles and plinth','Custom texture']:
        assert token in workspace
    assert 'function localizePanelBody' in workspace


def test_r1042_refrigerator_is_hard_pinned_to_run_edge():
    model = read('model.js')
    block = model[model.index('function enforceFridgeEdgeInvariant'):model.index('function centerCompositionAnchor')]
    assert "m.kind==='FRIDGE'" in block
    assert "return rest.concat(fridges)" in block
    assert "return fridges.concat(rest)" in block
    assert "isCornerGuard" in block
    arrange = model[model.index('function arrangeWall'):model.index('function buildModules')]
    assert 'ordered=enforceFridgeEdgeInvariant(ordered,edge)' in arrange
    assert arrange.index('ordered=enforceFridgeEdgeInvariant(ordered,edge)') > arrange.index('ordered=centerCompositionAnchor')


def test_r1042_global_handle_defaults_are_vertical_hinged_horizontal_drawers():
    model = read('model.js')
    workspace = read('workspace-r8.js')
    base = model[model.index('function baseModule'):model.index('function collectedLower')]
    assert "inputs.hinged_handle_orientation||'VERTICAL'" in base
    assert "inputs.drawer_handle_orientation||'HORIZONTAL'" in base
    assert "kind==='DRAWERS'?drawerHandle:hingedHandle" in base
    assert "hinged_handle_orientation:'VERTICAL'" in workspace
    assert "drawer_handle_orientation:'HORIZONTAL'" in workspace


def test_r1042_save_module_returns_to_full_kitchen_after_commit():
    model = read('model.js')
    block = model[model.index('async function saveModuleDraft'):model.index('function cancelModuleDraft')]
    assert 'await saveVisual' in block
    assert 'enterNormalKitchenView();renderScene(false)' in block
    assert 'bizet:modelchange' in block


def test_r1042_bom_test_is_visible_and_downloadable():
    workspace = read('workspace-r8.js')
    pointb = read('point-b.js')
    assert 'data-action="bom-test"' in workspace
    assert 'showBOMTest' in pointb
    assert 'BOM · TEST' in pointb
    assert 'id="dlBomTest"' in pointb
    assert 'downloadBOM(bom)' in pointb


def test_r1042_approval_drawings_are_three_page_client_documents():
    pointb = read('point-b.js')
    for name in ['approvalPlanSheet','approvalElevationSheet','approvalSectionSheet','approvalSheets','approvalDrawingHtml','openApprovalDrawings']:
        assert f'function {name}' in pointb
    for token in ['BIZET by Zaborsky','FOR APPROVAL','NOT FOR PRODUCTION','PLAN + AXONOMETRY','MAIN ELEVATION','TYPICAL SECTIONS']:
        assert token in pointb
    assert 'Page ' in pointb and '/3' in pointb


def test_r1042_pdf_builders_emit_real_pdf_bytes():
    from app.services.documents import build_approval_pdf, build_proposal_pdf
    svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect x="1" y="1" width="98" height="98" fill="none" stroke="black"/></svg>'
    approval = build_approval_pdf([svg, svg, svg])
    proposal = build_proposal_pdf('UA-ODS-TEST', {'price':'100 UAH','manufacturer':'BIZET','configuration':'Linear','features':['18 mm carcass']})
    assert approval.startswith(b'%PDF')
    assert proposal.startswith(b'%PDF')


def test_r1042_offer_email_supports_selected_pdf_attachments_and_reply_to():
    routes = (ROOT / 'app' / 'api' / 'routes_v11.py').read_text(encoding='utf-8')
    mail = (ROOT / 'app' / 'services' / 'mail.py').read_text(encoding='utf-8')
    business = read('owner-qa-business.js')
    assert 'include_proposal: bool = True' in routes
    assert 'include_approval_drawings: bool = False' in routes
    assert 'build_proposal_pdf' in routes and 'build_approval_pdf' in routes
    assert 'cdbbizet@gmail.com' in routes
    assert 'attachments=attachments' in routes
    assert 'payload["attachments"]' in mail
    assert 'payload["reply_to"]' in mail
    assert 'approval_svg_pages' in business


def test_r1042_offer_exposes_geometry_locked_visualization_prompt_and_whatsapp():
    business = read('owner-qa-business.js')
    assert 'BIZET_VISUALIZATION_PAYLOAD_V1' in business
    assert 'STRICT GEOMETRY LOCK' in business
    assert 'Do not redesign, add, remove, widen, narrow or relocate any module.' in business
    assert 'visualizationMasterPrompt' in business
    assert 'wa.me/380974587676' in business


def test_r1042_checkpoint_closes_historical_isolation_bug_without_regressing_focus():
    checkpoint = (ROOT / 'R10_4_0_MUST_HAVE_CHECKPOINT.md').read_text(encoding='utf-8')
    assert 'Owner QA closed the historical iPhone isolation bug after R10.4.1' in checkpoint
    assert 'Do not regress this lifecycle' in checkpoint

def test_r1042_offer_download_uses_real_pdf_endpoint():
    business = read('owner-qa-business.js')
    routes = (ROOT / 'app' / 'api' / 'routes_v11.py').read_text(encoding='utf-8')
    assert 'async function downloadOfferDocument' in business
    assert '/offer/document/${encodeURIComponent(kind)}' in business
    assert 'response.blob()' in business
    assert 'a.download=name' in business
    assert '@router.post("/projects/{project_id}/offer/document/{document_kind}")' in routes
    assert 'media_type="application/pdf"' in routes
    assert 'Content-Disposition' in routes


def test_r1044_start_uses_fresh_assets_and_custom_choice_has_no_visible_roman_v():
    index = read("index.html")
    start = read("start.js")
    for asset in ["start.css?v=1049", "start.js?v=1049", "start-room-handoff.js?v=1049"]:
        assert asset in index
    assert "{ value: 'V', title: { ru: 'Своя конфигурация', en: 'Custom configuration' }" in start
    assert "title: { ru: 'V', en: 'V' }" not in start
    assert "Категория V" not in start and "Category V" not in start


def test_r1043_room_source_has_no_continue_button_and_confirm_advances_directly():
    handoff = read("start-room-handoff.js")
    assert "startRoomSourceContinue" not in handoff
    assert "Continue to configuration" not in handoff
    assert "Далее к конфигурации" not in handoff
    confirm = handoff[handoff.index("confirm.onclick=async()=>"):handoff.index("function syncConfigurationSelection")]
    assert "renderConfigurationScreen(screen)" in confirm


def test_r1044_currency_is_visible_beside_price_and_survives_saved_variant_apply():
    html = read("workspace-r8.html")
    model = read("model.js")
    workspace = read("workspace-r8.js")
    pointb = read("point-b.js")
    assert 'id="projectCurrencySelect"' not in html
    assert 'id="projectCurrencySelect"' in pointb
    assert 'r104-price-line' in pointb
    assert "async function setDisplayCurrency" in model
    assert "projectCurrencySelect" in model
    apply = model[model.index("async function applyWorkspaceState"):model.index("function snapshot")]
    assert "globalCurrency" in apply
    assert "display_currency:globalCurrency" in apply
    assert "bizet:projectsettingchange" in model
    assert "propagateLockedValue('display_currency',detail.value)" in workspace


def test_r1043_offer_prints_explicit_currency_code_and_uses_factual_copy():
    business = read("owner-qa-business.js")
    routes = (ROOT / "app" / "api" / "routes_v11.py").read_text(encoding="utf-8")
    docs = (ROOT / "app" / "services" / "documents.py").read_text(encoding="utf-8")
    assert "const currencyCode=" in business
    assert "const offerMoney=n=>money(n)+' '+currencyCode()" in business
    assert "currency:currencyCode()" in business
    assert 'currency: str = "UAH"' in routes
    assert 'currency = str(payload.get("currency") or "UAH").upper()' in docs
    assert "Generated from the current saved BIZET OS project configuration" in docs
    assert "Final engineering and production validation is required" not in docs
    assert "Фасады — согласно текущей конфигурации проекта" in business
    assert "состав и стоимость соответствуют текущей сохранённой конфигурации" in business


def test_r1043_built_in_fridge_has_capped_lower_facade_250_vent_and_sheet_limits():
    model = read("model.js")
    pointb = read("point-b.js")
    lower = model[model.index("function collectedLower"):model.index("function wallSpan")]
    assert "kitchenTopZ()-plinthHeight()" in lower
    assert "fridge_bottom_vent_diameter_mm:freeFridge?0:250" in lower
    assert "max_part_length_mm:2780" in lower and "max_part_width_mm:2060" in lower
    rules = model[model.index("function applyFridgeConstructionRules"):model.index("function buildLower")]
    assert "neighbor_lower_facade_height_mm" in rules
    assert "Math.min(Math.max(100,Math.round((Number(fridge.h)||0)*.34)),neighborFacadeH)" in rules
    assert "Круглый вырез Ø250" in pointb
    assert "function splitOversizeFridgeRows" in pointb
    assert "MAX_L=2780,MAX_W=2060" in pointb


def test_r1043_plinth_segments_like_worktop_includes_builtins_and_prices_connectors():
    rules = read("r10-domain-rules.js")
    pointb = read("point-b.js")
    renderer = read("pilot-3d.js")
    assert "const PLINTH_RULES" in rules
    assert "MAX_UNSPLICED_MM:4100" in rules
    assert "function plinthRunPlan" in rules
    assert "ONE_UNIVERSAL_CONNECTOR_PER_JOINT_STRAIGHT_OR_CORNER" in rules
    assert "PLINTH_CONNECTOR:50" in pointb
    assert "Соединитель цоколя универсальный" in pointb
    assert "plinthConnectors" in pointb
    assert "m.level!=='upper'&&!m.freestanding&&Number(m.z)>0" in pointb
    plinth = renderer[renderer.index("function drawPlinth"):renderer.index("function drawTopAppliance")]
    assert "plinthRunPlan" in plinth
    assert "!m.freestanding&&Number(m.z)>0" in plinth
    assert "plan.segments.forEach" in plinth


def test_r1043_hood_visuals_distinguish_built_in_from_freestanding_and_bom_matches():
    model = read("model.js")
    renderer = read("pilot-3d.js")
    pointb = read("point-b.js")
    assert "hood_type:inputs.hood_type" in model
    assert "function drawBuiltInHood" in renderer
    assert "function drawFreestandingHood" in renderer
    assert "module.kind==='UPPER_HOOD'&&module.hood_type==='BUILT_IN'" in renderer
    assert "module.kind==='UPPER_HOOD'&&module.hood_type==='FREESTANDING'" in renderer
    assert "m.kind==='UPPER_HOOD')rows=m.hood_type==='FREESTANDING'?[]:upper" in pointb


def test_r1044_live_language_switch_rerenders_workspace_isolation_materials_offer_and_main_currency():
    html = read("workspace-r8.html")
    workspace = read("workspace-r8.js")
    model = read("model.js")
    business = read("owner-qa-business.js")
    pointb = read("point-b.js")
    assert "moduleCurrencySelect" not in html
    assert 'id="projectCurrencySelect"' in pointb
    assert "document.documentElement.lang==='en'?'Currency':'Валюта'" in pointb
    assert "window.addEventListener('bizet:languagechange'" in workspace
    assert "if(activePanel)renderPanel(activePanel)" in workspace
    assert "materialPickerDraft)renderMaterialPicker()" in workspace
    assert "window.addEventListener('bizet:languagechange'" in model
    assert "localizeModelChrome()" in model
    assert "window.addEventListener('bizet:languagechange'" in business
    assert "showThinkFlow().then" in business


def test_r1043_lower_oven_category_i_no_gola_support_shelf_is_body_top_minus_600():
    model = read("model.js")
    pointb = read("point-b.js")
    renderer = read("pilot-3d.js")
    assert "function categoryOneNoGola" in model
    assert "category==='I'" in model
    assert "oven_support_shelf_offset_from_top_mm:ovenShelf" in model
    assert "ovenShelf=lowerOven&&categoryOneNoGola()?600:null" in model
    ordinary = pointb[pointb.index("function ordinaryBase"):pointb.index("function sinkBase")]
    assert "const lowerOven=module.kind==='COOKTOP'&&module.oven_appliance_present" in ordinary
    assert "Number(module.oven_support_shelf_offset_from_top_mm)===600" in ordinary
    assert "Oven Support Shelf" in ordinary
    assert "верх корпуса − 600 мм" in ordinary
    focus = renderer[renderer.index("function drawTechnicalFocus"):renderer.index("// Phase 8 drawer internals")]
    assert "const frozenShelf=Number(module.oven_support_shelf_offset_from_top_mm)===600" in focus
    assert "const shelfTop=frozenShelf?z+h-600:z+70" in focus
    assert "!(module.kind==='COOKTOP'&&module.oven_appliance_present)" in focus


def test_r1043_sink_uses_exactly_two_vertical_facade_parallel_ribs_with_rear_top_minus_150():
    pointb = read("point-b.js")
    renderer = read("pilot-3d.js")
    sink = pointb[pointb.index("function sinkBase"):pointb.index("function drawerParts")]
    assert sink.count("'Rail Front'") == 1
    assert sink.count("'Rail Back Lower'") == 1
    assert "Rail Additional" not in sink
    assert "плоскость параллельна фасаду" in sink
    assert "верх ребра на 150 мм ниже верха корпуса" in sink
    focus = renderer[renderer.index("if(module.kind==='SINK')"):renderer.index("}else if(!ordinaryOven)")]
    assert "y:y,z:z+h-railH" in focus
    assert "y:y+d-railT,z:z+h-150-railH" in focus


def test_r1043_checkpoint_keeps_first_tap_isolation_closed_and_freezes_qa_pack():
    checkpoint = (ROOT / "R10_4_0_MUST_HAVE_CHECKPOINT.md").read_text(encoding="utf-8")
    assert "R10.4.3 owner QA corrections" in checkpoint
    assert "first-tap iPhone isolation lifecycle remains accepted CLOSED" in checkpoint
    assert "600 mm below the top of the cabinet body" in checkpoint


def test_r1049_wardrobes_card_has_hard_route_and_js_fallback():
    start = read("start.js")
    assert "hrefAttr = isWardrobeRoute ? ' href=\"/wardrobes\"' : ''" in start
    assert "window.location.assign('/wardrobes')" in start
    assert "/wardrobes?manufacturer=treeart" not in start


def test_r1044_custom_configuration_reports_in_development():
    start = read("start.js")
    assert "customDevelopment" in start
    assert "Мы работаем над этой функцией" in start
    assert "Custom configuration is currently in development" in start
    choose = start[start.index("async function choose(value)"):start.index("async function editSummaryStep")]
    assert "STEPS[currentStep]?.field==='complexity_category'&&value==='V'" in choose
    assert "showToast(copy('customDevelopment'))" in choose


def test_r1044_isolation_inputs_prevent_ios_focus_zoom_and_save_blurs_field():
    css = read("workspace-r8.css")
    model = read("model.js")
    assert ".r104-edit-field input,.r104-edit-field select" in css
    assert "font-size:16px!important" in css
    save = model[model.index("async function saveModuleDraft"):model.index("function cancelModuleDraft")]
    assert "document.activeElement.blur()" in save
    assert "enterNormalKitchenView();renderScene(false)" in save


def test_r1044_three_hinged_doors_are_disabled_below_900_and_middle_sides_follow_openings():
    model = read("model.js")
    pointb = read("point-b.js")
    renderer = read("pilot-3d.js")
    editor = model[model.index("function renderModuleEditor"):model.index("function readModuleEditor")]
    assert "[3,'3',Number(d.run_mm)!==900]" in editor
    read_editor = model[model.index("function readModuleEditor"):model.index("function refreshModuleDraftPrice")]
    assert "Number(next.run_mm)!==900&&Number(next.facade_count)===3" in read_editor
    assert "option[value=\"3\"]" in read_editor
    middle = model[model.index("function middleSideBoundaries"):model.index("function applyModuleEdit")]
    assert "normalized[i]==='RIGHT'||normalized[i+1]==='LEFT'" in middle
    assert "shelfCompartments" in pointb
    assert "Compartment" in pointb
    assert "middle_side_boundaries" in renderer
    assert "cuts=boundaries.length?[0,...boundaries,facadeCount]" in renderer


def test_r1044_sink_base_has_shelf_and_two_frozen_vertical_rails():
    pointb = read("point-b.js")
    sink = pointb[pointb.index("function sinkBase"):pointb.index("function drawerParts")]
    assert "'Sink Shelf'" in sink
    assert "Сервисный вырез сзади под коммуникации мойки" in sink
    assert sink.count("'Rail Front'") == 1
    assert sink.count("'Rail Back Lower'") == 1
    assert "Rail Additional" not in sink


def test_r1044_board_worktop_joint_cannot_touch_sink_and_3d_uses_same_plan():
    rules = read("r10-domain-rules.js")
    pointb = read("point-b.js")
    model = read("model.js")
    renderer = read("pilot-3d.js")
    assert "SINK_ADJACENT_JOINT_FORBIDDEN_CATEGORIES" in rules
    assert "NO_JOINT_ON_EITHER_BOUNDARY_TOUCHING_SINK_FOR_BOARD_WORKTOPS" in rules
    plan = rules[rules.index("function worktopRunPlan"):rules.index("window.BizetR10Rules")]
    assert "x.left?.kind==='SINK'||x.right?.kind==='SINK'" in plan
    assert "allowedBoundaries" in plan
    assert "worktopBlockedBySink" in pointb
    assert "['I','II'].includes(category)&&worktopType!=='STONE'" in pointb
    assert "function worktopAvoidSinkJoint" in model
    assert "worktopAvoidSinkJoint:worktopAvoidSinkJoint()" in model
    assert "worktopRunPlan?.(base,{avoidSinkJoint})" in renderer


def test_r1044_end_panels_are_default_between_walls_module_height_and_editable():
    model = read("model.js")
    pointb = read("point-b.js")
    renderer = read("pilot-3d.js")
    rules = model[model.index("function applyEndPanelRules"):model.index("function buildModules")]
    assert "configuration()!=='WALL_CENTER'" in rules
    assert "m.end_panel_height_mm=Math.round(Number(m.h)||0)" in rules
    assert "m.end_panel_floor_extension=false" in rules
    assert "shape==='L_SHAPE'?40:18" in rules
    editor = model[model.index("function renderModuleEditor"):model.index("function readModuleEditor")]
    assert "Торцевая панель" in editor
    assert "Г-образный филлер 40 мм" in editor
    assert "end_panel_material" in editor
    assert "function endPanelDetails" in pointb
    assert "В габарите модуля; не опускается в пол" in pointb
    assert "function drawEndPanel" in renderer


def test_r1044_plinth_keeps_4100_joint_and_renderer_shows_joint():
    rules = read("r10-domain-rules.js")
    renderer = read("pilot-3d.js")
    pointb = read("point-b.js")
    assert "MAX_UNSPLICED_MM:4100" in rules[rules.index("const PLINTH_RULES"):rules.index("function plinthRunPlan")]
    plinth = renderer[renderer.index("function drawPlinth"):renderer.index("function drawTopAppliance")]
    assert "plan.joints.forEach" in plinth
    assert "Соединитель цоколя универсальный" in pointb


def test_r1044_built_in_hood_has_150_duct_110_rear_offset_two_shelves_and_two_u_claddings():
    pointb = read("point-b.js")
    renderer = read("pilot-3d.js")
    hood = pointb[pointb.index("if(hood){"):pointb.index("const count=",pointb.index("if(hood){"))]
    assert "Hood Shelf Lower" in hood and "Hood Shelf Upper" in hood
    assert "['Left','Right'].forEach" in hood
    assert "Duct U1 ${side}" in hood and "Duct U1 Front" in hood
    assert "Duct U2 ${side}" in hood and "Duct U2 Front" in hood
    assert "Вырез Ø150" in hood
    assert "110 мм от задней стенки" in hood
    visual = renderer[renderer.index("function drawBuiltInHood"):renderer.index("function drawFreestandingHood")]
    assert "pipeR=75" in visual
    assert "pipeCy=module.y+module.d-110" in visual
    assert "uCover(lowerShelfZ+t,upperShelfZ)" in visual
    assert "uCover(upperShelfZ+t,topZ)" in visual


def test_r1044_tall_single_row_upper_gets_second_hanger_set_in_bom_and_focus_3d():
    pointb = read("point-b.js")
    renderer = read("pilot-3d.js")
    hardware = pointb[pointb.index("function countHardware"):pointb.index("function buildBOM")]
    assert "const hangerSets=(m.kind!=='UPPER_TOP'&&Number(m.h)>900)?2:1" in hardware
    focus = renderer[renderer.index("if(module.level==='upper')"):renderer.index("return front;",renderer.index("if(module.level==='upper')"))]
    assert "module.kind!=='UPPER_TOP'&&h>900" in focus
    assert "DOUBLE_SET_LEFT_RIGHT_REAR" in focus


def test_r1044_visualization_prompt_is_internal_not_customer_ui_and_offer_payload_carries_it():
    business = read("owner-qa-business.js")
    routes = (ROOT / "app" / "api" / "routes_v11.py").read_text(encoding="utf-8")
    flow = business[business.index("async function showThinkFlow"):business.index("async function showBuyFlow")]
    assert "PILOT PROMPT" not in flow
    assert "r104CopyVisualPrompt" not in flow
    assert "navigator.clipboard.writeText" not in flow
    assert "visualization_prompt:visualizationMasterPrompt(d)" in business
    assert "visualization_payload:visualizationPayload(d)" in business
    assert "visualization_prompt: str = \"\"" in routes
    assert "visualization_payload: dict[str, object]" in routes


def test_r1044_currency_is_left_of_price_not_in_3d_or_isolation():
    html = read("workspace-r8.html")
    pointb = read("point-b.js")
    css = read("point-b.css")
    assert "moduleCurrencySelect" not in html
    assert "projectCurrencyControl" not in html
    assert 'id="projectCurrencySelect"' in pointb
    line = pointb[pointb.index("r104-price-line"):pointb.index("pointBPriceButton")]
    assert line.index("projectCurrencySelect") < line.index("pointBPrice")
    assert ".r104-price-line" in css and ".r104-price-currency" in css


def test_r1044_checkpoint_freezes_polish_pack():
    checkpoint = (ROOT / "R10_4_0_MUST_HAVE_CHECKPOINT.md").read_text(encoding="utf-8")
    for token in [
        "R10.4.4 owner polish + hard rules",
        "Currency selector lives only in the main commercial/price area",
        "a joint may not sit on either module boundary touching the sink",
        "default end panels at both wall ends",
        "three-door layouts create two middle sides",
        "duct Ø150 mm",
        "second left/right hanger set",
        "Visualization master prompt is system-internal only",
    ]:
        assert token in checkpoint


def test_r1045_focus_back_and_ruler_move_to_lower_left_without_module_nav_collision():
    css = read("workspace-r8.css")
    html = read("workspace-r8.html")
    assert 'id="focusBackButton"' in html and 'id="modelDimensionsToggle"' in html
    block = css[css.index("/* R10.4.5 — focus controls"): ]
    assert "body.r10-module-focus .r8-stage-top" in block
    assert "top:auto!important" in block
    assert "left:12px!important" in block
    assert "bottom:12px!important" in block
    assert "body.r10-module-focus #constraintButton{display:none!important}" in block
    nav = css[css.index(".r104-focus-module-nav"):css.index(".r104-focus-module-nav[hidden]")]
    assert "top:10px" in nav and "right:10px" in nav


def test_r1045_full_kitchen_uses_one_default_cabinet_colour_without_anchor_highlight():
    renderer = read("pilot-3d.js")
    draw = renderer[renderer.index("const drawModule=module=>"):renderer.index("lower.forEach(drawModule)")]
    assert "const system=module.pending||module.system" not in draw
    assert "front:c.anchor" not in draw
    assert "front:c.system" not in draw
    assert "const style=freeFridge?" in draw
    assert "Anchors/system modules use the same project materials" in draw


def test_r1045_built_in_hood_is_opaque_in_full_view_and_technical_inside_focus_only():
    renderer = read("pilot-3d.js")
    hood = renderer[renderer.index("function drawBuiltInHood"):renderer.index("function drawFreestandingHood")]
    assert "technical=false" in hood
    assert "module.wall==='A'&&technical" in hood
    assert "drawBuiltInHood(ctx,projector,module,c,true)" in renderer
    normal = renderer[renderer.index("const drawModule=module=>"):renderer.index("lower.forEach(drawModule)")]
    assert "drawBuiltInHood(ctx,projector,module,c,false)" in normal


def test_r1045_tab_03_is_module_settings_with_all_global_dimensions_and_plinth_only_there():
    html = read("workspace-r8.html")
    workspace = read("workspace-r8.js")
    assert '<button data-panel="upper" type="button"><span>03</span>Настройка модулей</button>' in html
    assert "upper:['Настройка модулей','Module settings']" in workspace
    titles = workspace[workspace.index("function panelTitle"):workspace.index("function materialState")]
    assert "03 · НАСТРОЙКА МОДУЛЕЙ" in titles and "03 · MODULE SETTINGS" in titles
    upper = workspace[workspace.index("if(panel==='upper')"):workspace.index("if(panel==='communications')")]
    for key in ["lower_total_height_mm","upper_height_mm","upper_gap_mm","lower_depth_mm","upper_depth_mm","plinth_height_mm"]:
        assert key in upper
    room = workspace[workspace.index("if(panel==='room')"):workspace.index("if(panel==='appliances')")]
    general = workspace[workspace.index("if(panel==='general')"):workspace.index("$('panelBody').innerHTML")]
    assert "plinth_height_mm" not in room
    assert "plinth_height_mm" not in general
    assert "<h3>Ручки</h3>" in general


def test_r1045_module_dimension_inputs_drive_actual_model_geometry():
    model = read("model.js")
    for token in [
        "function lowerTotalHeight()",
        "function lowerDepth()",
        "function upperDepth()",
        "function upperConfiguredHeight()",
        "d:lowerDepth()",
        "bottom=lowerTotalHeight()+gap",
        "height=Math.min(upperConfiguredHeight(),room.heightMm-bottom-50)",
        "const uDepth=upperDepth()",
    ]:
        assert token in model
    assert "room.depthMm-uDepth" in model
    assert "room.lengthMm-uDepth" in model
    assert "Math.max(UPPER_HOOD_DEPTH,uDepth)" in model


def test_r1045_module_settings_defaults_preserve_current_dimensions_and_translate():
    workspace = read("workspace-r8.js")
    assert "lower_total_height_mm:900" in workspace
    assert "upper_height_mm:1000" in workspace
    assert "lower_depth_mm:560" in workspace
    assert "upper_depth_mm:320" in workspace
    for token in [
        "'Настройка модулей':'Module settings'",
        "'Общая высота нижних модулей, мм':'Overall base cabinet height, mm'",
        "'Общая высота верхних модулей, мм':'Wall cabinet height, mm'",
        "'Глубина нижних модулей, мм':'Base cabinet depth, mm'",
        "'Глубина верхних модулей, мм':'Wall cabinet depth, mm'",
    ]:
        assert token in workspace


def test_r1045_checkpoint_freezes_module_settings_and_visual_polish_pack():
    checkpoint = (ROOT / "R10_4_0_MUST_HAVE_CHECKPOINT.md").read_text(encoding="utf-8")
    for token in [
        "R10.4.5 module settings + visual polish",
        "Back and dimensions controls move to the lower-left",
        "no longer uses anchor/system role colouring",
        "technical isolation detail only",
        "Настройка модулей / Module settings",
        "lower total height, upper height, gap between lower and upper, lower depth, upper depth and plinth height",
        "Variant A remains HARD",
    ]:
        assert token in checkpoint
