"""Protected BIZET OS R10.6.3 adapter tests: do not replace actual GPU gate."""
from pathlib import Path
import shutil, subprocess
import pytest

STATIC=Path(__file__).resolve().parents[1]/"app"/"static"

def js(name): return (STATIC/name).read_text(encoding="utf-8")

def test_isolated_adapters_do_not_overwrite_bizet_3d_core():
    html=js("workspace-r8.html")
    assert "r1063-safe-ui.js?v=106301" in html
    assert "r1063-room-adapter.js?v=106301" in html
    script=js("r1063-room-adapter.js")
    assert "window.BizetPilot3D.drawKitchenScene=" not in script
    assert "window.BizetKitchenWebGL=" not in script
    assert "PRELIMINARY_UNVERIFIED" in script
    assert "STOP_UNCONFIRMED_SCANNED_GEOMETRY" in script
    assert "scan_original_walls_r1063" in script

def test_safeguarded_source_selection_joints_and_curves():
    script=js("r1063-room-adapter.js")
    for t in ("room_source_r1063","intersectionWarnings","curve_mm","rotation_deg",
              "thickness_mm","original","r1063Adopt","r1063Primary","r1063Apply",
              "r1063Reset","r1063Cancel","stopImmediatePropagation"):
        assert t in script

def test_browser_scripts_node_syntax():
    node=shutil.which("node")
    if not node:pytest.skip("node unavailable")
    for name in ("r1063-safe-ui.js","r1063-room-adapter.js","workspace-r8.js"):
        r=subprocess.run([node,"--check",str(STATIC/name)],capture_output=True,text=True)
        assert r.returncode==0,name+" "+r.stderr

def test_scan_geometry_on_real_coordinates_without_dom():
    node=shutil.which("node")
    if not node:pytest.skip("node unavailable")
    script=r"""
const fs=require('fs'),vm=require('vm');
const observations={walls:[
{id:'main',x1_mm:0,z1_mm:0,x2_mm:4000,z2_mm:0,height_mm:2700},
{id:'side',x1_mm:0,z1_mm:0,x2_mm:0,z2_mm:-3500,height_mm:2700}
]};
const w={addEventListener(){},BizetModelRuntime:{
 getVisual(){return {scan_import_r1060:observations}},getRoom(){return {lengthMm:4000,depthMm:3500}}
}};
const context={window:w,document:{getElementById(){return null}},localStorage:{getItem(){return 'ru'}},
 Math,Number,Array,Object,JSON,console};
vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),context);
const engine=w.BizetRoomR1063;
const g=engine.fitted({scan_import_r1060:observations});
if(!g||g.lengthMm!==4000||g.depthMm!==3500||g.heightMm!==2700)process.exit(2);
if(engine.source({scan_import_r1060:observations})!=='SCAN')process.exit(3);
if(engine.source({scan_import_r1060:observations,room_source_r1063:'TEMPLATE'})!=='TEMPLATE')process.exit(4);
"""
    p=subprocess.run([node,"-e",script,str(STATIC/"r1063-room-adapter.js")],text=True,capture_output=True)
    assert p.returncode==0,p.stderr+" "+str(p.returncode)
