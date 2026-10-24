"""BIZET OS 10.6.1 owner #08-20 contract checks.
Manual GLB/ZIP room capture, Safari and drawing comparison remain separate QA gates.
"""
from pathlib import Path
import shutil
import subprocess
import pytest

STATIC=Path(__file__).resolve().parents[1]/"app"/"static"
def read(name):return (STATIC/name).read_text(encoding="utf-8")

def test_room_source_is_mutually_exclusive_and_scan_is_unverified():
    src=read("room-r1061.js")
    assert "room_source_r1061" in src and "TEMPLATE" in src and "FILE" in src and "SCAN" in src
    assert "STOP_UNCONFIRMED_SCANNED_GEOMETRY" in src
    assert "thickness_mm" in src and "curve_mm" in src and "renderWalls" in src
    assert "8 control points" in src or "Eight perimeter handles" in src
    model=read("model.js")
    assert "BizetRoomR1061?.room(visual)" in model
    assert "SCAN_ROOM_UNVERIFIED_R1061" in model

def test_door_openings_and_panel_body_are_engineering_not_pure_drawings():
    model=read("model.js")
    panels=read("panels-r1061.js")
    drawing=read("point-b.js")
    viewer=read("kitchen-webgl-r1050.js")
    assert "m.level==='upper'&&m.kind==='UPPER'" in model
    assert "Math.max(250" in panels
    assert "panel_start_mm:left" in panels and "panel_end_mm:right" in panels
    assert "BizetPanelsR1061?.body" in drawing
    assert "BizetPanelsR1061?.body" in viewer
    assert "STOP_FRIDGE_PANEL_EXTERNAL_COMPENSATION_UNRESOLVED" in panels

def test_led_installation_price_vs_3d_toggle_are_distinct():
    led=read("led-r1061.js")
    for token in ["segments","profile","voltage_v:24","requiredWatts=watts*1.25","power_margin_pct:25","UNVERIFIED_UA_MARKET_OCT_2026"]:
        assert token in led
    viewer=read("kitchen-webgl-r1050.js")
    assert "new THREE.PointLight" in viewer
    assert "lightingGroup.visible=r1056LightingVisible" in viewer
    bom=read("point-b.js")
    assert "LED · предварительно" in bom
    assert 'stroke="#d8aa00"' in bom
    prod=read("production-r1050.js")
    assert "STOP_LED_MACHINING_AND_SUPPLIER_PROFILE_UNVERIFIED_R1061" in prod

def test_approval_author_pdf_style_uses_actual_3d_and_unique_sections():
    sheet=read("point-b.js")
    viewer=read("kitchen-webgl-r1050.js")
    for x in ["approvalScale","APPROVAL_UNITS_PER_MM","approvalSectionGroups","captureApprovalIsometric",
              "AXONOMETRIC VIEW · REAL 3D / ORTHOGRAPHIC","approval-hidden","hidden-lines-off",
              "FRONT VIEW · 1:","UNIQUE SECTION A–A"]:
        assert x in sheet or x in viewer
    assert "cameraIso=new THREE.OrthographicCamera" in viewer
    assert "3D ISOMETRIC VIEW UNAVAILABLE" not in sheet

def test_node_engine_geometry_and_panel_example():
    node=shutil.which("node")
    if not node:pytest.skip("Node not present")
    expr=r"""
const fs=require('fs'),vm=require('vm');const win={};
for(const p of process.argv.slice(1))vm.runInNewContext(fs.readFileSync(p,'utf8'),{window:win,Math,Number,Array,Object,Map,JSON});
const panel=win.BizetPanelsR1061;
const one=panel.body({wall:'A',x:0,w:600,end_panel_edges:['START'],end_panel_thickness_mm:18});
const two=panel.body({wall:'A',x:0,w:600,end_panel_edges:['START','END'],end_panel_thickness_mm:18});
if(one.w!==582||one.x!==18||two.w!==564||two.x!==18)process.exit(2);
if(panel.body({wall:'A',w:600,kind:'FRIDGE',end_panel_edges:['START']}).w!==600)process.exit(3);
const walls=[{id:'a',kind:'PRIMARY_WALL',x1_mm:-2000,z1_mm:0,x2_mm:2000,z2_mm:0,height_mm:2700},
{id:'b',kind:'PRIMARY_WALL',x1_mm:-2000,z1_mm:0,x2_mm:-2000,z2_mm:-3500,height_mm:2700}];
const room=win.BizetRoomR1061.room({scan_import_r1060:{walls}});
if(room.lengthMm!==4000||room.depthMm!==3500)process.exit(4);
const schedule=win.BizetLED1061.manifest({lighting_enabled:'YES',lighting_worktop:'YES',lighting_kelvin:3000},
  [{id:'M1',kind:'UPPER',level:'upper',wall:'A',w:900,h:750}]);
if(!schedule.included||schedule.total_mm!==864||schedule.drivers<1||schedule.kelvin!==3000)process.exit(5);
"""
    args=[str(STATIC/x) for x in ("panels-r1061.js","room-r1061.js","led-r1061.js")]
    c=subprocess.run([node,"-e",expr,*args],text=True,capture_output=True)
    assert c.returncode==0,c.stderr

def test_modified_scripts_parse_under_node():
    node=shutil.which("node")
    if not node:pytest.skip("Node not present")
    for file in ("panels-r1061.js","room-r1061.js","led-r1061.js","model.js","workspace-r8.js","kitchen-webgl-r1050.js","point-b.js"):
        result=subprocess.run([node,"--check",str(STATIC/file)],capture_output=True,text=True)
        assert result.returncode==0,file+" "+result.stderr
