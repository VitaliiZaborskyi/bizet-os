from pathlib import Path
import shutil
import subprocess
import pytest

ROOT=Path(__file__).resolve().parents[1]
STATIC=ROOT/"app"/"static"

def read(name):
    return (STATIC/name).read_text(encoding="utf-8")

def test_direction_gate_is_photo_led_and_locked_to_one_viewport():
    start=read("start.js")
    css=read("ui-viewer-pilot.css")
    for token in ["photo-1555041469-a586c61ea9bc","photo-1618221195710-dd6b41faaea6","photo-1503387762-592deb58ef4e","photo-1581094794329-c8112a89af12"]:
        assert token in start
    assert "--card-image:url" in start
    assert 'body[data-start-kind="bizet_direction"]{height:100dvh;overflow:hidden}' in css
    assert 'grid-template-columns:repeat(2,minmax(0,1fr))!important' in css

def test_built_in_fridge_has_two_fronts_neighbor_alignment_vent_and_grille_contract():
    model=read("model.js")
    viewer=read("kitchen-webgl-r1050.js")
    for token in ["facade_count:freeFridge?0:2","fridge_bottom_vent_diameter_mm:freeFridge?0:250","fridge_plinth_grille_width_mm:freeFridge?0:460","fridge_plinth_grille_height_mm:freeFridge?0:60","fridge_appliance_height_mm:freeFridge?tallHeight:1800"]:
        assert token in model
    assert "fridge.lower_facade_height_mm=Math.min(totalH-260,neighborFacadeH)" in model
    for token in ["function addBuiltInFridge","function addFridgeFacade","'fridge-bottom-vent-cutout'","'fridge-plinth-grille'","addFridgeFacade(room,m,z,lowerH,0","addFridgeFacade(room,m,z+lowerH+4,upperFacadeH,1"]:
        assert token in viewer

def test_drawer_and_horizontal_fronts_stack_vertically_not_diagonally():
    viewer=read("kitchen-webgl-r1050.js")
    front=viewer[viewer.index("function makeFront"):viewer.index("function plinthRecess")]
    assert "stacked=isDrawer||isLift" in front
    assert "h:fh-2,z:+m.z+index*(fh+gap)" in front
    assert "spec.w=Math.max(20,+m.w-2)" in front
    assert "spec.d=Math.max(20,+m.d-2)" in front

def test_template_opening_rule_uses_center_and_sink_upper_double_exception():
    model=read("model.js")
    assert "function applyTemplateOpeningRules" in model
    assert "configuration()==='CUSTOM'" in model
    assert "lower.find(m=>m.kind==='COOKTOP')||lower.find(m=>m.kind==='TALL_OVEN')" in model
    assert "<=axis?'LEFT':'RIGHT'" in model
    assert "m.level==='upper'&&m.source_kind==='SINK'&&run>600" in model
    assert "m.facade_openings=['LEFT','RIGHT']" in model
    assert "template_opening_locked=true" in model

def test_outer_template_modules_receive_visible_front_flush_end_panels():
    model=read("model.js")
    viewer=read("kitchen-webgl-r1050.js")
    assert "function applyEndPanelRules" in model
    assert "m.end_panel_front_flush=true" in model
    assert "cornerEdgesForWall(wall)" in model
    assert "function addEndPanels" in viewer
    assert "'end-panel'" in viewer
    assert "frontFlush=true" in viewer

def test_plinth_and_legs_share_40_or_90_mm_recess_rule():
    viewer=read("kitchen-webgl-r1050.js")
    assert "return I.dishwasher_type&&I.dishwasher_type!=='NO'?90:40" in viewer
    assert "+m.y+recess" in viewer
    assert "front-recess-28" in viewer
    assert "recess=plinthRecess()" in viewer
    assert "pl.userData.recess_mm=recess" in viewer

def test_horizontal_lift_hardware_is_visible_in_main_and_isolation():
    model=read("model.js")
    viewer=read("kitchen-webgl-r1050.js")
    assert "['LIFT_ONLY','Aventos HK']" in model
    assert "2 газлифта + петли" in model
    assert "function addLiftHardware" in viewer
    assert "'aventos-hk-proxy'" in viewer
    assert "'gas-lift-proxy'" in viewer
    build=viewer[viewer.index("function buildFurniture"):viewer.index("function frame(")]
    assert build.count("addLiftHardware(room,m)")>=2
    assert "makeFront(room,m,i,count,focusFront.clone())" in build

def test_view_facades_and_drawers_toggle_on_single_tap_without_motion_button():
    viewer=read("kitchen-webgl-r1050.js")
    overlay=read("workspace-r1050.js")
    assert "window.BIZET_KITCHEN_UI_MODE==='VIEW'&&id" in viewer
    assert "mv.target=mv.target>.5?0:1" in viewer
    assert "moved>8" in viewer
    assert "lastTap.id===id" not in viewer
    assert "['deepShadowButton','motionButton'].forEach" in overlay

def test_changed_pilot_js_has_valid_syntax_when_node_is_available():
    node=shutil.which("node")
    if not node:
        pytest.skip("node unavailable")
    for name in ["start.js","model.js","kitchen-webgl-r1050.js","workspace-r1050.js"]:
        result=subprocess.run([node,"--check",str(STATIC/name)],capture_output=True,text=True)
        assert result.returncode==0, f"{name}: {result.stderr}"
