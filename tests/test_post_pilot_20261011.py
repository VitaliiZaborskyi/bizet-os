from pathlib import Path
import shutil
import subprocess
import pytest

ROOT=Path(__file__).resolve().parents[1]
STATIC=ROOT/"app"/"static"

def read(name):
    return (STATIC/name).read_text(encoding="utf-8")

def test_fix_01_end_panels_stay_inside_module_envelope():
    viewer=read("kitchen-webgl-r1050.js")
    block=viewer[viewer.index("function addEndPanels"):viewer.index("function lowerRuns")]
    assert "edge==='START'?+m.x:+m.x+ +m.w-t" in block
    assert "edge==='START'?+m.y:+m.y+ +m.d-t" in block
    assert "+m.x-t" not in block
    assert "+m.y-t" not in block

def test_fix_02_oven_is_visible_as_real_3d_visual_group():
    viewer=read("kitchen-webgl-r1050.js")
    assert "function addTallOvenVisual" in viewer
    assert "'oven-3d'" in viewer
    assert "'oven-frame'" in viewer
    assert "OVEN_HANDLE" in viewer
    assert "if(m.kind==='TALL_OVEN')addTallOvenVisual" in viewer

def test_fix_03_kitchen_motion_moves_complete_front_assemblies_outward():
    viewer=read("kitchen-webgl-r1050.js")
    assert "function addDrawerBox" in viewer
    assert "group.attach(mesh);addDrawerBox" in viewer
    assert "mover.group?.attach(h)" in viewer
    assert "mover.pivot?.attach(h)" in viewer
    assert "function doorOpenSign" in viewer
    assert "m.group.position.copy(base).add" in viewer
    assert "m.pivot.rotation.y=(m.sign??doorOpenSign" in viewer

def test_fix_04_legs_and_plinth_do_not_share_coplanar_box_faces():
    viewer=read("kitchen-webgl-r1050.js")
    assert "function addSupportLeg" in viewer
    assert "new THREE.CylinderGeometry(radTop,radBottom" in viewer
    assert "foot-mounting-plate" in viewer
    assert "nominalFrontOffsetMm=recess" in viewer
    assert "d:12,h:ph" in viewer
    assert "w:12,d:+m.d,h:ph" in viewer

def test_fix_05_isolation_uses_same_module_and_same_builder():
    viewer=read("kitchen-webgl-r1050.js")
    model=read("model.js")
    assert "addFocusInternals" not in viewer
    build=viewer[viewer.index("function buildFurniture"):viewer.index("function frame(")]
    assert "focus=!!options.focusMode" in build
    assert "mods.forEach(buildOne)" in build
    assert "addCarcass(room,m,body)" in build
    focus=model[model.index("function renderModuleFocus"):model.index("function renderScene")]
    assert "modules:[current]" in focus
    assert "clone={...current" not in focus
    assert "configuration:configuration()" in focus

def test_fix_06_ready_furniture_grande_has_visible_edges():
    grande=read("grande-r1048.js")
    assert "function addVisibleEdges(mesh)" in grande
    assert "new THREE.EdgesGeometry(mesh.geometry,28)" in grande
    assert "viewerEdge:true" in grande
    box=grande[grande.index("function box("):grande.index("function cylinder(")]
    assert "addVisibleEdges(mesh)" in box

def test_fix_07_ready_furniture_view_opens_complete_drawers_and_doors_on_single_tap():
    overlay=read("grande-r1050.js")
    assert "let motion=true,deep=false" in overlay
    assert "moved>8" in overlay
    assert "lastTap" not in overlay
    assert "buildDoorPivot(m)" in overlay
    assert "buildDrawerMove(m)" in overlay
    assert "pid.startsWith(part+'_HANDLE')" in overlay
    assert "['deepShadowGrande','motionGrande'].forEach" in overlay

def test_fix_08_rod_anchor_is_a_hard_core_rule_and_grande_consumes_it():
    rules=read("r10-domain-rules.js")
    grande=read("grande-r1048.js")
    html=read("grande-r1046.html")
    assert "CENTER_BELOW_UPPER_SHELF_MM:80" in rules
    assert "ANCHOR:'NEAREST_UPPER_SHELF_UNDERSIDE'" in rules
    assert "classification:'HARD'" in rules
    assert "function clothesRodCenterFromUpperShelf" in rules
    assert "BizetR10Rules?.clothesRodCenterFromUpperShelf" in grande
    assert "upperShelfCenter-t/2-80" in grande
    assert "80 мм" in grande
    assert "/static/r10-domain-rules.js?v=20261020r1055" in html

def test_fix_09_header_and_price_use_surface_contrast_not_only_theme():
    css=read("ui-viewer-pilot.css")
    grande_css=read("grande-r1050.css")
    assert "Pilot #09" in css
    assert 'html[data-theme="light"] .r8-topbar' in css
    assert 'html[data-theme="dark"] .r8-topbar' in css
    assert '#pointBFinalActions .r104-price-line' in css
    assert ".r10-constraint-banner *{color:#fff!important}" in css
    assert ".priceHud,.priceHud span,.priceHud strong{color:#fff!important}" in grande_css

def test_new_pilot_assets_are_cache_busted():
    workspace=read("workspace-r8.html")
    index=read("index.html")
    grande=read("grande-r1046.html")
    for asset in [
        "/static/model.js?v=20261021r1059",
        "/static/kitchen-webgl-r1050.js?v=20261021r1059",
        "/static/r10-domain-rules.js?v=20261020r1055",
        "/static/ui-viewer-pilot.css?v=20261015",
    ]:
        assert asset in workspace
    assert "/static/ui-viewer-pilot.css?v=20261015" in index
    for asset in [
        "/static/grande-r1048.js?v=20261021r1056",
        "/static/grande-r1050.js?v=20261020r1054",
        "/static/grande-r1050.css?v=20261011b",
        "/static/r10-domain-rules.js?v=20261020r1055",
    ]:
        assert asset in grande

def test_new_pilot_js_syntax_if_node_available():
    node=shutil.which("node")
    if not node:
        pytest.skip("node unavailable")
    for name in ["model.js","kitchen-webgl-r1050.js","grande-r1048.js","grande-r1050.js","r10-domain-rules.js"]:
        result=subprocess.run([node,"--check",str(STATIC/name)],capture_output=True,text=True)
        assert result.returncode==0, f"{name}: {result.stderr}"
