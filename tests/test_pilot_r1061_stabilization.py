"""BIZET OS 10.6.1 owner 08-19 stabilization regression contracts."""
from pathlib import Path
import shutil
import subprocess
import pytest

STATIC=Path(__file__).resolve().parents[1]/"app"/"static"
def read(path):return (STATIC/path).read_text(encoding="utf-8")

def test_scan_back_wall_and_junctions_use_same_coordinates():
    room=read('room-r1061.js')
    assert "const interiorSign=Math.abs(minDepth)>Math.abs(maxDepth)?-1:1" in room
    assert "depthMm/2-frame.behind(a)*frame.interiorSign" in room
    assert "Preserve any scan junction" in room
    assert "wallModuleIntersections" in room
    model=read('model.js')
    assert "STOP_SCANNED_WALL_MODULE_INTERSECTION" in model
    assert "SCAN_ROOM_UNVERIFIED_R1061" in model

def test_fridge_panel_outside_and_no_silent_manufacturing_compensation():
    viewer=read('kitchen-webgl-r1050.js')
    model=read('model.js')
    production=read('production-r1050.js')
    assert "m.kind==='FRIDGE'?+m.x-t:+m.x" in viewer
    assert "m.kind==='FRIDGE'?+m.x+ +m.w:+m.x+ +m.w-t" in viewer
    assert "fridge_end_panel_compensation_status" in model
    assert "STOP_FRIDGE_PANEL_COMPENSATION" in model
    assert "STOP_FRIDGE_PANEL_COMPENSATION" in production
    assert "minRun(m)" not in model # avoid raw substitution that invalidates original modules

def test_ru_en_switch_without_reload_and_panel_mapping():
    ui=read('workspace-r8.js')
    assert "location.reload()" not in ui
    assert "Open room scan" in ui and "Import PDF / photo" in ui
    assert "'Белый мрамор · чёрные прожилки':'White marble · black veins'" in ui
    assert "window.dispatchEvent(new CustomEvent('bizet:languagechange'" in ui

def test_node_geometry_and_600_mm_panels():
    node=shutil.which('node')
    if not node: pytest.skip('Node not available')
    script=r"""
const fs=require('fs'),vm=require('vm'),win={};
for(const p of process.argv.slice(1))vm.runInNewContext(fs.readFileSync(p,'utf8'),{window:win,Math,Number,Array,Object,JSON,Map});
const v={scan_import_r1060:{walls:[
{id:'main',kind:'PRIMARY_WALL',x1_mm:0,z1_mm:0,x2_mm:4000,z2_mm:0,height_mm:2700},
{id:'left',kind:'SECONDARY_WALL',x1_mm:0,z1_mm:0,x2_mm:0,z2_mm:-3500,height_mm:2700},
{id:'right',kind:'SECONDARY_WALL',x1_mm:4000,z1_mm:0,x2_mm:4000,z2_mm:-3500,height_mm:2700}]}};
const engine=win.BizetRoomR1061,room=engine.room(v),f=room.frame;
if(room.lengthMm!==4000||room.depthMm!==3500||f.interiorSign!==-1)process.exit(11);
const wallBack=room.depthMm/2-f.behind([0,0])*f.interiorSign;
const wallFront=room.depthMm/2-f.behind([0,-3500])*f.interiorSign;
if(wallBack!==1750||wallFront!==-1750)process.exit(12);
if(engine.wallModuleIntersections(v,[{id:'middle',x:1700,y:2500,w:500,d:600}]).length)process.exit(13);
if(!engine.wallModuleIntersections(v,[{id:'intersecting',x:0,y:2500,w:500,d:600}]).length)process.exit(14);
const panel=win.BizetPanelsR1061;
for(const [edges,expected] of [[['START'],582],[['START','END'],564]]){
 const result=panel.body({kind:'HINGED',wall:'A',x:0,w:600,end_panel_edges:edges,end_panel_thickness_mm:18});
 if(result.w!==expected)process.exit(15);
}
if(panel.body({kind:'FRIDGE',wall:'A',x:0,w:600,end_panel_edges:['START']}).w!==600)process.exit(16);
"""
    run=subprocess.run([node,'-e',script,str(STATIC/'room-r1061.js'),str(STATIC/'panels-r1061.js')],capture_output=True,text=True)
    assert run.returncode==0,run.stderr+' rc='+str(run.returncode)

def test_changed_js_syntax():
    node=shutil.which('node')
    if not node:pytest.skip('Node not available')
    for name in ('room-r1061.js','model.js','workspace-r8.js','kitchen-webgl-r1050.js','production-r1050.js','panels-r1061.js'):
        run=subprocess.run([node,'--check',str(STATIC/name)],capture_output=True,text=True)
        assert run.returncode==0,name+' '+run.stderr
