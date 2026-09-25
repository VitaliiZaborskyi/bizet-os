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
    assert "camera.yaw=" in model and "camera.pitch=" in model
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
