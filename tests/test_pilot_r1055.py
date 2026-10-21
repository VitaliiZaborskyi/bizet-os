"""Owner #21–#32 acceptance contracts for R10.5.5 pilot.

Code-level tests; browser touch/device visual QA and manufacturer CAD validation
are separate OPEN activities. Product-specific default parameters are provisional.
"""
from pathlib import Path
import shutil
import subprocess
import pytest

STATIC=Path(__file__).resolve().parents[1]/"app"/"static"
def read(file): return (STATIC/file).read_text(encoding="utf-8")

def test_21_hold_drag_and_45_degree_room_rotation():
    js=read("grande-r1048.js")
    html=read("grande-r1046.html")
    for token in ["HOLD_MS=460","rotatedFootprint(deg=S.angleDeg)","activePointers.size!==1",
                  "setTimeout(()=>","objectDragMode=true;objectMove","controls.enabled=false",
                  "direction*45","saveGrandePlacement()","rotationAllowed(deg)",
                  "window.dispatchEvent(new CustomEvent('bizet:spatialchange'"]:
        assert token in js
    assert 'id="objectRotationControls"' in html
    assert "Rotate right 45 degrees" in html

def test_22_mandatory_grande_shelf_not_part_of_user_shelf_count():
    js=read("grande-r1048.js")
    assert "const mandatoryShelfY" in js
    assert "STRUCTURAL_REQUIRED_SHELF" in js
    assert "GR.RS-LOCK" in js
    assert js.index("STRUCTURAL_REQUIRED_SHELF")<js.index("for(let i=1;i<=S.shelvesRight;i++){")

def test_23_shared_menu_not_redundant_language_dropdown():
    html=read("grande-r1046.html")
    common=read("pilot-shell.js")
    assert '<select id="lang"' not in html
    assert 'id="settingsButton"' in html
    assert "if (document.getElementById('workspaceSettingsPanel')) return" not in common
    assert "pilotLanguageSelect" in common
    assert "BizetUnifiedMenuEnabled=true" in read("workspace-r8.html")

def test_24_internal_orthogonal_led_and_kelvin_are_project_inputs():
    js=read("kitchen-webgl-r1050.js")
    work=read("workspace-r8.js")
    for s in ["function addInternalLED","function lightingRgb(k)","depthTest:true,depthWrite:true",
              "LED_PROFILE_","LED_DIFFUSER_","lighting_kelvin","buildLighting(room,mods)"]:
        assert s in js
    assert "THREE.AdditiveBlending" not in js[js.index("function lightingRgb"):js.index("function buildFurniture")]
    assert 'data-input="lighting_kelvin"' in work
    assert "lighting_kelvin:3000" in work

def test_25_cylinders_clear_plinth_back_surface():
    js=read("kitchen-webgl-r1050.js")
    assert "+m.y+recess+38" in js
    assert "front-recess-38" in js
    assert "front+recess+38" in js
    assert "function plinthRecess" in js

def test_26_no_default_base_roof_and_two_horizontal_100mm_rails():
    js=read("kitchen-webgl-r1050.js")
    model=read("model.js")
    pb=read("point-b.js")
    prod=read("production-r1050.js")
    assert "const hasTop=!ordinaryBase||explicitTop" in js
    assert "'FRONT_STRETCHER'" in js and "'REAR_STRETCHER'" in js
    assert "d:100,h:t" in js and "w:100,d:" in js
    assert "'Rail Front',inner,100" in pb and "'Rail Back',inner,100" in pb
    assert "module.top_panel_override==='YES'" in pb
    assert "top_panel_override:module.top_panel_override||'NO'" in model
    assert "frontRail,'LFR'" in prod and "rearRail,'LRR'" in prod

def test_26_30_drawer_base_and_filler_closure_are_consistent():
    pb=read("point-b.js")
    three=read("kitchen-webgl-r1050.js")
    assert "'Rail Front',inner,100" in pb
    assert "'Rail Back',inner,100" in pb
    assert "module.top_panel_override==='YES'" in pb
    assert "frontRail,'LFR'" in read("production-r1050.js")
    assert "m.kind==='FILLER'&&m.level!=='upper'" in pb
    assert "m.kind==='FILLER'&&m.level!=='upper'" in three
    assert "m.tall||m.kind==='FILLER'" in three


def test_27_fixed_shelf_only_with_64mm_and_manufacturing_block():
    rules=read("r10-domain-rules.js"); model=read("model.js");viewer=read("kitchen-webgl-r1050.js");p=read("production-r1050.js")
    assert "STEP_MM:64" in rules
    assert "allowedShelfPositions" in rules
    assert "m.shelf_type!=='FIXED'" in rules
    assert "function commitShelfMove" in model
    assert "STOP_PROFILE_REQUIRED" in model
    assert "bizet:shelfhold" in viewer
    assert "STOP_UNVERIFIED_SHELF_CONNECTION_MACHINING" in p

def test_28_hinge_collision_execution_in_node():
    node=shutil.which("node")
    if not node: pytest.skip("Node unavailable")
    script=r"""
const vm=require('vm'),fs=require('fs'),assert=require('assert'),w={};
vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),{window:w});
const r=w.BizetR10Rules;
const m={kind:'HINGED',z:100,h:868,shelf_type:'FIXED',shelf_count:1,hinge_count:3};
const baseline=r.planHingePositions(m,[534]);
assert.strictEqual(baseline.count,3);
assert(baseline.ok,JSON.stringify(baseline));
assert(baseline.positions.every(v=>Math.abs(v-534)>=r.r1055ShelfRules.HINGE_CLEARANCE_PROXY_MM));
assert.strictEqual(r.allowedShelfPositions(m,0).every(x=>x.delta_mm%64===0),true);
assert.strictEqual(r.allowedShelfPositions({...m,shelf_type:'ADJUSTABLE'},0).length,0);
assert.strictEqual(r.planHingePositions({...m,h:100},[]).ok,false);
"""
    p=subprocess.run([node,"-e",script,str(STATIC/"r10-domain-rules.js")],capture_output=True,text=True)
    assert p.returncode==0,p.stdout+p.stderr

def test_29_isolation_frame_key_includes_module_identity():
    js=read("kitchen-webgl-r1050.js")
    assert "options.focusMode?mods.map(m=>[m.id,m.w,m.d,m.h]" in js

def test_30_plinth_returns_are_drawn_and_counted_in_bom():
    viewer=read("kitchen-webgl-r1050.js");pb=read("point-b.js")
    assert "function addPlinthEndReturns" in viewer
    assert "addPlinthEndReturns(room,wall,list,pm)" in viewer
    assert "plinthEndReturns" in pb
    assert "Возврат цоколя к стене / панели" in pb

def test_31_corner_reserve_avoids_dropping_fridge_and_upper_runs_align():
    m=read("model.js")
    assert "ordered=ensureCornerZones(ordered,wall);" in m
    assert "const endCornerIndex" in m
    assert "MANDATORY_RUN_OVERFLOW_" in m
    assert "lower.filter(m=>!m.tall&&m.level==='lower').forEach" in m

def test_32_superseded_real_provider_with_readonly_engineering_prompt():
    js=read("visualization-r1055.js");html=read("workspace-r8.html")
    for token in ["function snapshot()","function promptFor(scene)","CANONICAL SCENE (read only)",
                  "room_elements:","crypto.subtle.digest","referenceCapture()","const API=\'/api/v1.1/visualization\'","fetch(API+\'/generate\'",
                  "window.BizetVisualizationR1056"]:
        assert token in js
    assert 'readonly aria-readonly="true"' in js
    assert 'id="openVisualizationR1056"' in html
    assert "visualization-r1055.js?v=1057" in html


def test_r1055_js_syntax():
    node=shutil.which("node")
    if not node: pytest.skip("Node unavailable")
    for name in ["grande-r1048.js","pilot-shell.js","pilot-r8-shell.js","model.js","kitchen-webgl-r1050.js",
                 "point-b.js","production-r1050.js","r10-domain-rules.js","workspace-r8.js","visualization-r1055.js"]:
        r=subprocess.run([node,"--check",str(STATIC/name)],capture_output=True,text=True)
        assert r.returncode==0,name+": "+r.stderr
