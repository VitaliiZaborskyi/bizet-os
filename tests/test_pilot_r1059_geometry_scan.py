"""Owner-approved BIZET OS 10.5.9 pilot invariants.

Automated smoke/contract tests supplement — not replace — owner iPhone visual
acceptance and actual source GLB geometry comparison.
"""
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "app" / "static"

def source(name):
    return (STATIC / name).read_text(encoding="utf-8")

def test_scan_has_only_one_primary_upload_choice_and_auto_detect_without_paid_provider():
    page = source("scan-r1058.html")
    code = source("scan-r1058.js")
    detector = source("scan-auto-r1059.js")
    assert page.count('id="scanChooseImport"') == 1
    assert 'id="scanOpenPicker"' not in page
    assert "scanOpenPicker" not in code
    assert "scanFileInput').click()" in code
    assert 'id="scanDetectWalls"' in page
    assert "runAutoDetection()" in code
    assert "AUTO_PLANE_PROPOSAL" in code
    assert "new THREE.PlaneGeometry(len,wallHeight)" in code
    assert "LOCAL_MESH_VERTICAL_PLANE_PROPOSAL" in detector
    assert "Math.abs(normal.y)>.3" in detector
    assert "GLTFLoader" in page
    assert "fflate@0.8.3" in page
    assert "OPENAI_API_KEY" not in detector
    assert "fetch(" not in detector

def test_scan_annotation_communication_is_preliminary_and_never_machining_ready():
    js = source("scan-r1058.js")
    for s in ["scanWallLengthMm","scanWallOffsetMm","scanWallAngleDeg",
              "scanWallHeightMm","scanUtilityKind","scanUtilityOffset",
              "scanUtilityHeight","owner_reviewed","communications:",
              "production_ready:false","STOP_UNCONFIRMED_SCANNED_GEOMETRY"]:
        assert s in js
    assert "room.geometry.wall_length" not in js
    assert "room.geometry.wall_depth" not in js

def test_scan_legacy_prompt_no_longer_auto_renders_on_back_navigation():
    room = source("room-latest.js")
    html = source("scan-r1058.html")
    assert "buildScanPilot();" not in room
    assert "buildGeometryInputQuestion();" not in room
    assert "window.location.assign('/scan'" in room
    assert "id=\"scanChooseProvider\"" in html

def test_furniture_settings_and_drilling_safe_defaults():
    js = source("model.js")
    workspace = source("workspace-r8.js")
    renderer = source("kitchen-webgl-r1050.js")
    assert "DEFAULT_LOWER_DEPTH=515,DEFAULT_REAR_CLEARANCE=45" in js
    assert "placed.y=room.depthMm-placed.d-lowerWallGap();" in js
    assert "placed.x=lowerWallGap();" in js
    assert "lower_depth_mm:515,lower_wall_gap_mm:45" in workspace
    assert "Стандарт: столешница 600 мм" not in workspace
    assert "dish_dryer_variant" in workspace
    assert "m.kind==='SINK'?'UPPER_DRYER'" in js
    assert "addDishDryingRack(room,m)" in renderer
    assert "lower_roof" not in renderer

def test_upper_roof_is_shortened_but_bottom_kept_full_and_oven_is_backless():
    viewer = source("kitchen-webgl-r1050.js")
    assert "shortenUpperRoof?1:0" in viewer
    assert "D-21" in viewer
    assert "const skipOvenBack=" in viewer
    assert "if(!skipOvenBack)push(" in viewer
    assert "groove_status='PARAMETRIC_PENDING_MACHINING_PROFILE'" in viewer
    assert "push({x:x+t,y,z,w:Math.max(20,W-2*t),d:D,h:t},'BOTTOM')" in viewer
    assert "new THREE.CylinderGeometry(radTop,radBottom" in viewer
    assert "hinge-articulating-arm" in viewer

def test_fixed_shelves_are_equal_and_selection_capped_at_five():
    rules = source("r10-domain-rules.js")
    model = source("model.js")
    viewer = source("kitchen-webgl-r1050.js")
    assert "POSITION_EDITING:'FROZEN_EQUAL_COMPARTMENTS_R1059'" in rules
    assert "Math.min(5" in rules
    assert "shelf_z_overrides_mm=[]" in model
    assert "Math.min(5" in viewer
    assert "for(let i=1;i<=count;i++)" in viewer
    assert "[[0,'0'],[1,'1'],[2,'2'],[3,'3'],[4,'4'],[5,'5']]" in model

def test_shelf_clearance_math_node_without_any_dom():
    node=shutil.which("node")
    if not node:
        import pytest
        pytest.skip("Node is unavailable")
    js = source("r10-domain-rules.js")
    expression=r"""
const fs=require('fs'),vm=require('vm'),sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),sandbox);
const rule=sandbox.window.BizetR10Rules,th=18;
if(!rule?.fixedShelfCenters)process.exit(5);
for(let n=0;n<=5;n++){
 const m={z:100,h:1000,shelf_count:n,shelf_z_overrides_mm:[111,222,333,444,555]};
 const centers=rule.fixedShelfCenters(m);
 if(centers.length!==n)process.exit(6);
 const ends=[100+th,...centers.flatMap(x=>[x-th/2,x+th/2]),100+1000-th];
 const gaps=[];for(let i=0;i<n+1;i++)gaps.push(ends[2*i+1]-ends[2*i]);
 if(Math.max(...gaps)-Math.min(...gaps)>0.001)process.exit(7);
}
"""
    check=subprocess.run([node,"-e",expression,str(STATIC/"r10-domain-rules.js")],
                         capture_output=True,text=True)
    assert check.returncode==0,check.stderr

def test_visualization_one_location_and_focus_mobile_remains_legible():
    html=source("workspace-r8.html")
    js=source("workspace-r8.js")
    assert 'id="openVisualizationTop"' not in html
    assert 'id="openVisualizationR1056"' not in html
    assert 'data-panel="general"' in html
    assert 'id="openVisualizationFromExportR1056"' in js
    assert "grid-template-columns:repeat(7,minmax(0,1fr))" in html
    assert "#focusBackButton" in html
    assert "#modelDimensionsToggle" in html
    assert "visualization-r1055.js" in html

def test_renderer_kitchen_view_double_tap_access_to_open_modules():
    js=source("kitchen-webgl-r1050.js")
    assert "lastFacadeTap.id===moduleId" in js
    assert "now-lastFacadeTap.at<370" in js
    assert "document.querySelector('#moduleStrip [data-module=" in js

def test_node_javascript_syntax_for_new_scanner_and_modified_carcass():
    node=shutil.which("node")
    if not node:
        import pytest
        pytest.skip("Node is unavailable")
    for name in ["scan-r1058.js","scan-auto-r1059.js","model.js",
                 "kitchen-webgl-r1050.js","workspace-r8.js"]:
        result=subprocess.run([node,"--check",str(STATIC/name)],capture_output=True,text=True)
        assert result.returncode==0, name+": "+result.stderr
