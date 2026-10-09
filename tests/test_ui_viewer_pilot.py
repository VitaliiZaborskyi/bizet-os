from pathlib import Path
import shutil
import subprocess
import pytest

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "app" / "static"

def read(name):
    return (STATIC / name).read_text(encoding="utf-8")

def test_ui_pilot_assets_are_layered_after_r1051():
    assert '/static/ui-viewer-pilot.css?v=20261009' in read("index.html")
    assert '/static/ui-viewer-pilot.css?v=20261009' in read("workspace-r8.html")
    assert 'version="R10.5.1"' in (ROOT/"app"/"main.py").read_text(encoding="utf-8")

def test_direction_gate_is_frontend_only_and_has_four_future_branches():
    start=read("start.js")
    for token in ["renderDirectionGate","renderDesignPlaceholder","FURNITURE","DESIGN","REPAIR","ENGINEERING"]:
        assert token in start
    assert "pilot-disabled-choice" in start
    assert "currentStep === 0" in start
    assert "currentStep = 1" in start

def test_workspace_always_enters_presentation_view():
    ws=read("workspace-r8.js")
    assert "setKitchenUiMode('VIEW')" in ws
    assert "setKitchenUiMode(localStorage.getItem(KITCHEN_MODE_KEY)||'VIEW')" not in ws

def test_conditional_settings_disable_impossible_appliance_fields():
    ws=read("workspace-r8.js")
    for token in [
        "function applyConditionalSettings",
        "fridge_present",
        "dishwasher_type",
        "oven_location",
        "microwave_present",
        "coffee_present",
        "setSettingDisabled('microwave_type'",
        "['NO','Нет'],['LOWER','В нижнем модуле'],['TALL','В пенале']",
    ]:
        assert token in ws

def test_module_lighting_is_multiselect_and_has_visualization_only_contract():
    ws=read("workspace-r8.js")
    viewer=read("kitchen-webgl-r1050.js")
    for token in ["lighting_enabled","lighting_plinth","lighting_worktop","lighting_upper_inside","lighting_lower_inside","data-lighting-zone"]:
        assert token in ws
        assert token in viewer or token == "data-lighting-zone"
    assert "Multiple zones can be active at once" in ws
    assert "visualizationProxy:true,productionProxy:false" in viewer
    assert "makeLightingGradient" in viewer

def test_viewer_uses_visible_edges_cleaner_ao_and_technical_isolation():
    viewer=read("kitchen-webgl-r1050.js")
    assert "new THREE.EdgesGeometry" in viewer
    assert "viewerEdge:true" in viewer
    assert "focus?0xd9dde1:0x34383d" in viewer
    assert "saoPass.params.saoIntensity=.014" in viewer
    assert "saoPass.params.saoKernelRadius=20" in viewer
    assert "saoPass.params.saoBlurRadius=8" in viewer

def test_default_environment_is_graphite_and_walnut_like():
    viewer=read("kitchen-webgl-r1050.js")
    assert "wall:pick('walls','wallPreset','#565b61')" in viewer
    assert "floor:pick('floor','floorPreset','#694932')" in viewer
    assert "function makeWalnutTexture" in viewer
    assert "THREE.RepeatWrapping" in viewer

def test_fridge_overlap_plinth_and_sink_faucet_visual_bugs_are_addressed():
    viewer=read("kitchen-webgl-r1050.js")
    assert "former body+appliance overlap caused z-fighting" in viewer
    assert "['FRIDGE','DISHWASHER'].includes(m.kind)" in viewer
    assert "y:+first.y-18" in viewer
    assert "'faucet-proxy'" in viewer
    assert "it never implies machining, cutout or BOM" in viewer
    assert "'sink-proxy'" in viewer

def test_theme_and_disabled_state_css_contract():
    css=read("ui-viewer-pilot.css")
    for token in ['html[data-theme="light"]','html[data-theme="dark"]','.r1052-disabled-setting','.r1052-lighting-grid','#111214','#f7f7f4']:
        assert token in css

def test_ui_pilot_js_syntax_if_node_available():
    node=shutil.which("node")
    if not node:
        pytest.skip("node is not available")
    for name in ["start.js","workspace-r8.js","kitchen-webgl-r1050.js"]:
        result=subprocess.run([node,"--check",str(STATIC/name)],capture_output=True,text=True)
        assert result.returncode==0, f"{name}: {result.stderr}"
