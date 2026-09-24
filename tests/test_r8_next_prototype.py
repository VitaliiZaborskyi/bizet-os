from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "app" / "static"


def read(name: str) -> str:
    return (STATIC / name).read_text(encoding="utf-8")


def test_r8_configuration_auto_advances_without_continue_button():
    js = read("start-room-handoff.js")
    assert "configurationContinue5" not in js
    assert "window.location.assign('/workspace?project='" in js
    assert '/room-setup?project=' not in js
    assert 'BizetTransition?.play' in js
    assert "config-auto-note" in js


def test_r8_workspace_has_exact_five_saved_variant_controls():
    html = read("workspace-r8.html")
    js = read("workspace-r8.js")
    assert 'id="variantDots"' in html
    assert 'id="randomVariant"' in html
    assert js.count("upper_layout:") >= 5
    assert "VARIANT_TEMPLATES" in js
    assert "variantSlots.length===5" in js
    assert "applyWorkspaceState" in js
    assert "data-variant-slot" in js


def test_r8_appliance_block_has_explicit_apply():
    js = read("workspace-r8.js")
    assert 'data-action="apply-appliances"' in js
    assert "appliances_confirmation_status" in js
    assert "selectPanel('upper')" in js


def test_r8_module_customization_has_parametric_dimensions():
    html = read("workspace-r8.html")
    model = read("model.js")
    for ident in ["moduleWidth", "moduleHeight", "moduleDepth", "moduleOpening", "moduleOffsetInput", "moduleApply"]:
        assert f'id="{ident}"' in html
    assert "module_size_overrides" in model
    assert "applyModuleCustomization" in model
    assert "renderScene(false)" in model


def test_r8_freestanding_fridge_is_edge_managed_and_dishwasher_has_side_panels():
    model = read("model.js")
    render = read("pilot-3d.js")
    assert "inputs.fridge_type==='FREESTANDING'" in model
    assert "fridgeWall()" in model
    assert "edgeForWall" in model
    assert "side_panel_mm:sidePanel" in model
    assert "drawFreestandingDishwasher" in render
    assert "module.kind==='FRIDGE'&&module.freestanding" in render


def test_r8_room_elements_support_depth_and_wall_d():
    workspace = read("workspace-r8.js")
    render = read("pilot-3d.js")
    assert "__element_depth" in workspace
    assert "depth_mm" in workspace
    assert "wall==='D'" in render
    assert "RADIATOR" in render
    assert "PROJECTION" in render


def test_r8_desktop_keeps_model_while_editor_scrolls():
    css = read("workspace-r8.css")
    assert "body.r8-workspace-body{height:100vh;overflow:hidden}" in css
    assert ".r8-panel{height:100%;min-height:0;overflow-y:auto}" in css


def test_r8_web_app_and_resume_recovery_are_present():
    shell = read("pilot-r8-shell.js")
    model = read("model.js")
    manifest = json.loads(read("manifest.webmanifest"))
    assert manifest["display"] == "standalone"
    assert manifest["start_url"] == "/"
    assert "bizet:resume" in shell
    assert "visibilitychange" in shell
    assert "pageshow" in shell
    assert "resumeFromSleep" in model


def test_r8_dark_is_first_launch_default():
    assert "localStorage.getItem(THEME_KEY) || 'dark'" in read("start.js")
    assert "localStorage.getItem(THEME_KEY) || 'dark'" in read("pilot-shell.js")


def test_owner_qa_visual_contracts_are_present():
    start_css = read("start.css")
    setup_css = read("room-setup-r8.css")
    workspace_css = read("workspace-r8.css")
    shell = read("pilot-r8-shell.js")
    index = read("index.html")
    start_js = read("start.js")
    # R8 visual/typography restored; only approved brand + splash remain from R9.
    assert '"Century Gothic"' not in start_css
    assert '"Century Gothic"' not in setup_css
    assert '"Century Gothic"' not in workspace_css
    assert '"SF Pro Display"' in start_css
    assert '"SF Pro Display"' in setup_css
    assert '"SF Pro Display"' in workspace_css
    assert 'class="brand-master">ZABORSKY' in index
    assert 'class="brand-main">BIZET <i>OS</i>' in index
    assert '.brand .brand-master' in start_css
    assert '.brand .brand-main i' in start_css
    assert '.r8-project-state{position:absolute;right:132px' in workspace_css
    assert '.r8-topbar .settings-wrap{position:absolute;right:18px' in workspace_css
    assert '@keyframes r8FlyZ' in shell
    assert '@keyframes r8FlyB' in shell
    assert '@keyframes r8FlyOS' in shell
    assert 'color:#2f7cff' in shell
    assert 'data:audio/mpeg;base64,' in shell
    assert 'if (!step?.actionId)' in start_js
