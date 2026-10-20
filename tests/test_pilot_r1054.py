"""Owner 2026-10-20 acceptance rules #16–#20.

These are code/Node policy regression checks, NOT a browser touch QA
and NOT a verified manufacturer XML import test.
"""
from pathlib import Path
import json
import shutil
import subprocess
import pytest

STATIC=Path(__file__).resolve().parents[1]/"app"/"static"
def read(name): return (STATIC/name).read_text(encoding="utf-8")

def test_16_21_grande_camera_orbit_and_owner_superseding_long_hold_movement():
    js=read("grande-r1048.js")
    html=read("grande-r1046.html")
    assert "let objectDragMode=false" in js
    assert "HOLD_MS=460" in js
    assert "document.body.classList.contains('view-mode')" in js
    assert "if(!hitFurniture(e.clientX,e.clientY))return" in js
    assert "controls.enabled=false" in js
    assert "controls.enabled=true" in js
    assert "renderer.domElement.style.touchAction='none'" in js
    assert "activePointers.size!==1" in js
    assert "syncObjectDragButton()" in js
    assert 'id="objectRotationControls"' in html
    assert 'id="settingsButton"' in html


def test_17_edit_idle_orbit_remains_bounded_and_interaction_interrupts():
    js=read("grande-r1048.js")
    for token in ["IDLE_WAIT_MS=4500","IDLE_SWEEP_RAD=.075","pauseIdleOrbit()","function idleEditOrbit()",
                  "activePointers.size","document.body.classList.contains('view-mode')",
                  "Math.abs(diff)>.72","idleYawCenter=null"]:
        assert token in js
    assert "CAM-EDIT-006 OPEN" not in js # this comes from registry; range is provisional
    assert "Math.PI*2" not in js[js.index("function idleEditOrbit"):js.index("function animate")]

def test_18_19_20_run_shared_owner_rules_in_node():
    node=shutil.which("node")
    if not node: pytest.skip("Node.js not installed")
    script=r"""
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const w={};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),{window:w});
const r=w.BizetR10Rules;
assert(r.r1054HandlePolicy.EXCLUSIVE_APPLIED_AND_PROFILE);
assert(r.r1054FridgePolicy.SUPPORTS_REQUIRED);
assert(r.r1054FridgePolicy.COMMON_PLINTH_REQUIRED);
assert.strictEqual(r.appliedHandleOffset('left','OPPOSITE_HINGES',300,40),260);
assert.strictEqual(r.appliedHandleOffset('right','OPPOSITE_HINGES',300,40),-260);
assert.strictEqual(r.appliedHandleOffset('left','CENTER',300,40),0);
assert.strictEqual(r.resolveModuleHandle({kind:'HINGED',handle_override_mode:'INDIVIDUAL',individual_handle_system:'EDGE'}, {handle_system:'STANDARD'}).system,'STANDARD');
const fridge={kind:'FRIDGE',tall:true,z:100,level:'lower',handle_override_mode:'INDIVIDUAL',individual_handle_system:'EDGE',handle_placement:'CENTER'};
assert.strictEqual(r.resolveModuleHandle(fridge,{handle_system:'GOLA'}).system,'EDGE');
assert.strictEqual(r.resolveModuleHandle(fridge,{handle_system:'GOLA'}).applied,false);
assert.strictEqual(r.resolveModuleHandle(fridge,{handle_system:'GOLA'}).placement,'CENTER');
fridge.handle_override_mode='INHERIT';
assert.strictEqual(r.resolveModuleHandle(fridge,{handle_system:'GOLA'}).system,'GOLA');
assert(r.requiresFloorSupports(fridge));
assert(r.requiresCommonPlinth(fridge));
assert(!r.requiresFloorSupports({...fridge,freestanding:true}));
assert(!r.requiresFloorSupports({...fridge,suspended:true}));
assert(!r.requiresFloorSupports({...fridge,level:'upper'}));
console.log('r1054 engineering rules PASS');
"""
    p=subprocess.run([node,"-e",script,str(STATIC/"r10-domain-rules.js")],capture_output=True,text=True)
    assert p.returncode==0,p.stdout+"\n"+p.stderr

def test_18_19_module_editor_and_3d_handle_pivot():
    model=read("model.js");viewer=read("kitchen-webgl-r1050.js")
    for token in ["handle_placement:module.handle_placement||'OPPOSITE_HINGES'",
                  "handle_override_mode:module.handle_override_mode||'INHERIT'",
                  "individual_handle_system:module.individual_handle_system||'STANDARD'",
                  "'handle_override_mode',d.handle_override_mode",
                  "'individual_handle_system',d.individual_handle_system",
                  "module.handle_override_mode=edit.handle_override_mode==='INDIVIDUAL'"]:
        assert token in model
    for token in ["appliedHandleOffset?.(side,handlePolicy.placement",
                  "handlePolicy.applied","else if(handlePolicy.profile)",
                  "mover.pivot?.attach(mesh)","pivot.attach(handle)"]:
        assert token in viewer

def test_20_fridge_common_plinth_grille_and_bom():
    model=read("model.js");viewer=read("kitchen-webgl-r1050.js");pointb=read("point-b.js")
    for token in ["fridge.floor_support_required=true","fridge.fridge_common_plinth=true",
                  "fridge.fridge_grille_in_plinth=true","fridge.fridge_plinth_bypass=false"]:
        assert token in model
    for token in ["addBuiltInFridge(room,m,body,front);addLegs(room,m)",
                  "function plinthRuns(modules)","list.filter(m=>m.tall).forEach",
                  "function addFloorPlinth","function addFridgeHinges","addFridgeHinges(room,m)","'fridge-plinth-grille'",
                  "gw=Number(m.fridge_plinth_grille_width_mm)||460",
                  "gh=Number(m.fridge_plinth_grille_height_mm)||60"]:
        assert token in viewer
    assert "m.kind!=='FRIDGE'&&Number(m.z)>0" not in pointb
    assert "включая встроенный холодильник" in pointb
    assert "Вентиляционная решётка цоколя 460×60 мм" in pointb
    assert "m.tall&&(window.BizetR10Rules?.requiresFloorSupports" in pointb

def test_r1054_script_syntax_if_node_available():
    node=shutil.which("node")
    if not node: pytest.skip("Node.js unavailable")
    for name in ["r10-domain-rules.js","model.js","kitchen-webgl-r1050.js","point-b.js","grande-r1048.js","grande-r1050.js"]:
        r=subprocess.run([node,"--check",str(STATIC/name)],capture_output=True,text=True)
        assert r.returncode==0,f"{name}: {r.stderr}"
