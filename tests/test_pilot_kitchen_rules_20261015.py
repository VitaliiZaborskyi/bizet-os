from pathlib import Path
import shutil
import subprocess
import pytest

ROOT=Path(__file__).resolve().parents[1]
STATIC=ROOT/"app"/"static"

def read(name):
    return (STATIC/name).read_text(encoding="utf-8")

def test_fix_10_lower_oven_uses_project_height_worktop_supports_and_real_drawer():
    model=read("model.js")
    rules=read("r10-domain-rules.js")
    viewer=read("kitchen-webgl-r1050.js")
    pointb=read("point-b.js")
    assert "BODY_HEIGHT_FORMULA:'LOWER_OVERALL_MINUS_WORKTOP_MINUS_SUPPORTS'" in rules
    assert "DEFAULT_APPLIANCE_HEIGHT_MM:600" in rules
    assert "DRAWER_BOX_REDUCTION_FROM_FACADE_MM:50" in rules
    assert "lowerBodyHeight(){return Math.max(300,lowerTotalHeight()-plinthHeight()-worktopThickness())}" in model
    assert "ovenDrawerFacadeH=lowerOven?Math.max(0,lowerBodyHeight()-ovenH-ovenGap):0" in model
    assert "ovenDrawerBoxH=Math.max(0,ovenDrawerFacadeH-(Number(ovenRules.DRAWER_BOX_REDUCTION_FROM_FACADE_MM)||50))" in model
    assert "function addBaseOvenAssembly" in viewer
    assert "makeFront(room,drawerModule,0,1" in viewer
    ordinary=pointb[pointb.index("function ordinaryBase"):pointb.index("function sinkBase")]
    assert "'Facade Drawer Oven'" in ordinary
    assert "drawerParts(module,1,drawerFacadeH" in ordinary

def test_fix_11_sink_has_facade_three_on_edge_rails_and_kronas_tray_bom():
    rules=read("r10-domain-rules.js")
    model=read("model.js")
    viewer=read("kitchen-webgl-r1050.js")
    pointb=read("point-b.js")
    for token in [
        "RAIL_COUNT:3",
        "RAIL_ORIENTATION:'VERTICAL_ON_EDGE'",
        "REAR_UPPER_RAIL_FROM_TOP_MM:150",
        "600:Object.freeze({article:'08773'",
        "800:Object.freeze({article:'08774'",
        "900:Object.freeze({article:'08775'",
        "1000:Object.freeze({article:'110433'",
    ]:
        assert token in rules
    assert "sink_rail_count:3" in model
    sink=pointb[pointb.index("function sinkBase"):pointb.index("function drawerParts")]
    for token in ["'Rail Front Top'","'Rail Rear Bottom'","'Rail Rear Upper'","'Facade Sink'"]:
        assert token in sink
    assert "'Sink Shelf'" not in sink
    assert "function addSinkCarcass" in viewer
    assert "'sink-tray'" in viewer
    assert "Поддон под мойку" in pointb
    assert "KRONAS арт." in pointb

def test_fix_12_open_cabinets_show_shelves_and_hood_changes_with_type():
    viewer=read("kitchen-webgl-r1050.js")
    workspace=read("workspace-r8.js")
    assert "function addCarcassShelves" in viewer
    assert "partRole='SHELF_'" in viewer
    assert "function addHoodVisual" in viewer
    assert "builtIn=m.hood_type!=='FREESTANDING'" in viewer
    assert "'hood-body'" in viewer
    assert "'hood-duct'" in viewer
    assert "if(m.kind==='UPPER_HOOD'&&m.hood_type==='FREESTANDING')" in viewer
    for label in [
        "Выбор модели холодильника","Выбор модели варочной","Выбор модели ПММ",
        "Выбор модели вытяжки","Выбор модели духовки"
    ]:
        assert label in workspace
    assert "disabled aria-disabled=\"true\"" in workspace

def test_fix_13_worktop_avoids_sink_and_cooktop_and_plinth_joint_is_visible():
    rules=read("r10-domain-rules.js")
    viewer=read("kitchen-webgl-r1050.js")
    pointb=read("point-b.js")
    assert "JOINT_FORBIDDEN_ADJACENT_KINDS:Object.freeze(['SINK','COOKTOP'])" in rules
    assert "blockedByCriticalZone" in rules
    assert "worktopRunPlan?.(list,{enforceCriticalZones:true})" in viewer
    assert "'plinth-seam'" in viewer
    assert "plinthRunPlan?.(list)" in viewer
    assert "worktopBlockedByCriticalZone" in pointb
    assert "стык запрещён на границах, касающихся мойки или варочной панели" in pointb

def test_fix_14_template_dishwasher_is_required_near_sink_and_flaps_down():
    rules=read("r10-domain-rules.js")
    model=read("model.js")
    workspace=read("workspace-r8.js")
    viewer=read("kitchen-webgl-r1050.js")
    assert "TEMPLATE_REQUIRED:true" in rules
    assert "ALLOWED_WIDTHS_MM:Object.freeze([450,600])" in rules
    assert "PLACEMENT_PRIORITY:'IMMEDIATELY_AFTER_SINK_ELSE_NEAREST'" in rules
    assert "OPENING:'FLAP_DOWN'" in rules
    assert "HANDLE_TOP_OFFSET_MM:40" in rules
    assert "function ensureDishwasherNearSink" in model
    assert "effectiveDishType=templateKitchen&&requestedDish==='NO'?'BUILT_IN':requestedDish" in model
    assert "dishwasher_opening:'FLAP_DOWN'" in model
    assert "state.inputs.dishwasher_width_mm=i%2?450:600" in workspace
    assert "function addDishwasherFacade" in viewer
    assert "type:'dishwasher'" in viewer
    assert "p.y+=spec.h/2-40" in viewer
    assert "m.type==='dishwasher'" in viewer
    assert "rotation.x=-m.current*Math.PI*.48" in viewer

def test_fix_15_variable_worktop_and_inactive_model_buttons_are_wired():
    workspace=read("workspace-r8.js")
    html=read("workspace-r8.html")
    css=read("ui-viewer-pilot.css")
    assert "worktop_thickness_mm:38" in workspace
    assert "numberField('Толщина столешницы, мм','worktop_thickness_mm',38,10)" in workspace
    assert "oven_height_mm:600" in workspace
    assert "/static/workspace-r8.js?v=20261021r1059" in html
    assert "/static/point-b.js?v=20261021r1059" in html
    assert "/static/kitchen-webgl-r1050.js?v=20261021r1059" in html
    assert ".r1053-model-choice" in css

def test_pilot_20261015_js_syntax_if_node_available():
    node=shutil.which("node")
    if not node:
        pytest.skip("node unavailable")
    for name in [
        "r10-domain-rules.js","model.js","kitchen-webgl-r1050.js",
        "workspace-r8.js","point-b.js"
    ]:
        result=subprocess.run([node,"--check",str(STATIC/name)],capture_output=True,text=True)
        assert result.returncode==0, f"{name}: {result.stderr}"
