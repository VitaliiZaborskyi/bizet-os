"""Owner visual/drawings 21-29: smoke contracts and synthetic print layout.
Does not replace manual iPhone/MacBook screenshots and 23-page author PDF comparison.
"""
from pathlib import Path
import shutil,subprocess
import pytest

ROOT=Path(__file__).resolve().parents[1]/"app"/"static"
def js(n):return (ROOT/n).read_text(encoding="utf-8")

def test_21_header_controls_stay_individually_accessible():
    css=js("r1062.css");html=js("workspace-r8.html")
    for x in ("#backButton","#r1061TopbarHelp","#baseInfoButton","#settingsButton",".r8-project-state"):
        assert x in css and x in html
    assert "column-gap:4px" in css and "min-width:32px" in css
    assert "r1062.css?v=106201" in html

def test_22_facade_thickness_not_old_8mm_proxy():
    s=js("kitchen-webgl-r1050.js")
    section=s[s.index("function r1062FacadeThicknessMm()"):s.index("function addProfileHandle(")]
    assert "facade.thickness_mm" in section and "facadeThickness" in section
    assert "spec.d=facadeThickness" in section
    assert "spec.w=facadeThickness" in section
    assert "mesh.userData.thickness_mm=facadeThickness" in section
    assert "spec.d=8;spec.y=+m.y-9" not in section

def test_23_cup_35mm_attached_to_opening_door():
    s=js("kitchen-webgl-r1050.js")
    assert "function addDoorHingeCups(" in s
    assert "new THREE.CylinderGeometry(17.5,17.5,11,32)" in s
    assert "mover.pivot.attach(mesh)" in s
    assert "hinge-cabinet-plate-r1062" in s
    assert "STOP_HINGE_BORING_UNVERIFIED" in s

def test_24_led_is_visible_line_and_independent_bom():
    s=js("kitchen-webgl-r1050.js")
    assert "led-emissive-line-r1062" in s and "led-photometric-preview-r1062" in s
    assert "brightness*2.7" in s and "lightingGroup.visible=r1056LightingVisible" in s
    assert "BizetLED1061?.manifest" in s and "isVisualSwitchOnly=true" in s
    assert "LED · предварительно" in js("point-b.js")

def test_25_29_source_linked_svg_engine_and_dimensions():
    html=js("workspace-r8.html");draw=js("approval-r1062.js");client=js("point-b.js")
    assert "approval-r1062.js?v=106201" in html
    assert "set.overview(modules,room,approvalStamp,orderRef)" in client
    for token in ("INSTALLATION ZONE","AXONOMETRIC · ORTHOGRAPHIC","FRONT VIEW","LEFT VIEW",
                  "r1062Hatch","approval-hidden","UNIQUE SECTION DETAILS","stroke-dasharray"):
        assert token in draw
    assert "NTS AXO" in draw # Never claim printable exact axo scale until empirically calibrated
    assert "TOP VIEW · 1:" in draw and "FRONT VIEW · 1:" in draw
    assert "side==='LEFT'?'M '+X" in draw

def test_synthetic_approval_svg_dimensions_and_door_apex():
    node=shutil.which("node")
    if not node:pytest.skip("Node unavailable")
    program=r"""
const vm=require('vm'),fs=require('fs');
const context={window:{},console};
vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),context);
const d=context.window.BizetApprovalR1062;
const room={lengthMm:6000,depthMm:4200,heightMm:2800};
const modules=[
{id:'M1',number:1,kind:'HINGED',level:'lower',wall:'A',x:0,y:3600,z:100,w:600,d:515,h:700,facade_count:2,facade_openings:['LEFT','RIGHT'],shelf_count:1},
{id:'M2',number:2,kind:'HINGED',level:'lower',wall:'A',x:600,y:3600,z:100,w:600,d:515,h:700,facade_count:2,facade_openings:['LEFT','RIGHT'],shelf_count:1},
{id:'M3',number:3,kind:'UPPER',level:'upper',wall:'A',x:0,y:3850,z:1600,w:600,d:320,h:700,facade_count:1,shelf_count:2}
];
const stamp=(n,txt)=>'<g><text>'+n+txt+'</text></g>';
const pages=[d.overview(modules,room,stamp,'TEST'),d.elevation(modules,room,stamp,'TEST'),d.sections(modules,room,stamp,'TEST')];
if(pages.length!==3||pages.some(s=>!s.includes('viewBox="0 0 1120 790"')||!s.includes('</svg>')))process.exit(2);
if(!pages[0].includes('INSTALLATION ZONE')||!pages[0].includes('AXONOMETRIC'))process.exit(3);
if(!pages[1].includes('LEFT VIEW')||!pages[2].includes('M1, M2'))process.exit(4);
if(pages[0].includes('ISOMETRIC 3D NOT AVAILABLE'))process.exit(5);
const n=d.scale(6000,520,2800,400);if(n!==50)process.exit(6);
"""
    r=subprocess.run([node,"-e",program,str(ROOT/"approval-r1062.js")],capture_output=True,text=True)
    assert r.returncode==0,(r.stderr or "")+" rc="+str(r.returncode)

def test_modified_js_syntax():
    node=shutil.which("node")
    if not node:pytest.skip("Node unavailable")
    for name in ("approval-r1062.js","kitchen-webgl-r1050.js","point-b.js"):
        r=subprocess.run([node,"--check",str(ROOT/name)],capture_output=True,text=True)
        assert r.returncode==0,name+" "+r.stderr
