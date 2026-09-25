from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "app" / "static"

def read(name: str) -> str:
    return (STATIC / name).read_text(encoding="utf-8")

def test_r10_phase1_configuration_routes_to_workspace_not_room_setup():
    handoff = read("start-room-handoff.js")
    assert "window.location.assign('/workspace?project='" in handoff
    assert "window.location.assign('/room-setup?project='" not in handoff
    assert "BizetTransition.play" in handoff

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
    assert "#modelCanvas{touch-action:none}" in css


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
    for token in ["Technical carcass: explicit 18 mm panels", "Ghosted facade", "Structural rail / rib", "Shelves"]:
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
    assert "Список услуг по изделиям" in proposal
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


def test_r10_normal_view_is_forced_after_variant_resume_resize_and_panel_open():
    model = read("model.js")
    workspace = read("workspace-r8.js")
    apply_block = model[model.index("async function applyWorkspaceState"):model.index("function snapshot")]
    resume_block = model[model.index("async function resumeFromSleep"):model.index("window.BizetModelRuntime")]
    assert "enterNormalKitchenView()" in apply_block
    assert "enterNormalKitchenView()" in resume_block
    assert "window.addEventListener('resize'" in model
    assert "enterNormalKitchenView()" in model[model.index("window.addEventListener('resize'"):]
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
    assert "Math.max(LIMITS.STRAIGHT_MAX,runWidth(m)" in max_block

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
    assert "Math.min(roomH-100" in dims
    assert "if(options.focusMode)return original(canvas,options)" in dims
    assert "module.room_height_adapted=adapted" in dims

def test_r101_module_dimensions_exist_only_in_focus_and_can_be_toggled():
    html = read("workspace-r8.html")
    model = read("model.js")
    renderer = read("pilot-3d.js")
    assert 'id="modelDimensionsToggle"' in html
    assert 'Размеры модуля · вкл' in html
    normal = model[model.index("function renderNormalKitchen"):model.index("function renderModuleFocus")]
    focus = model[model.index("function renderModuleFocus"):model.index("function renderScene")]
    assert "showModuleDimensions:false" in normal
    assert "showModuleDimensions:focusDimensionsVisible" in focus
    assert "focusDimensionsVisible=!focusDimensionsVisible" in model
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

def test_r101_hardware_renderer_uses_scilm_and_blum_specific_proxies():
    renderer = read("pilot-3d.js")
    assert "function drawScilmLegProxy" in renderer
    assert "function drawBlumHingeProxy" in renderer
    assert "drawScilmLegProxy" in renderer[renderer.index("function drawTechnicalFocus"):]
    assert "drawBlumHingeProxy" in renderer[renderer.index("function drawTechnicalFocus"):]
    assert "35 mm cup" in renderer
    assert "straight plate" in renderer

def test_r101_dishwasher_is_optional_by_default():
    workspace = read("workspace-r8.js")
    model = read("model.js")
    assert "['NO','Нет']" in workspace
    assert "dishwasher_type:'NO'" in workspace
    assert "inputs.dishwasher_type!=='NO'" in model

def test_r101_constraint_warning_is_visible_for_nonstandard_adaptation():
    html = read("workspace-r8.html")
    model = read("model.js")
    assert 'id="constraintBanner"' in html
    assert "НЕСТАНДАРТНАЯ КОНФИГУРАЦИЯ" in model
    assert "ROOM_HEIGHT_ADAPTED" in model
    assert "RUN_OVERFLOW_" in model

def test_r101_filler_is_not_costed_as_full_cabinet():
    pointb = read("point-b.js")
    assert "function fillerDetail" in pointb
    assert "'Filler Panel'" in pointb
    assert "m.kind==='FILLER'" in pointb
    assert "['DISHWASHER','FRIDGE','FILLER']" in pointb
