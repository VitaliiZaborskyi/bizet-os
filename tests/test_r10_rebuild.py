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
