"""BIZET OS R10.6.2 owner PDF 30-38 + addendum 38 + patch 39.
No assertion here substitutes for live Safari 3D visual QA or author PDF printed comparison.
"""
from pathlib import Path
import shutil,subprocess
import pytest

STATIC=Path(__file__).resolve().parents[1]/"app"/"static"
def file(name):return (STATIC/name).read_text(encoding="utf-8")

def test_30_real_geometry_health_and_camera():
    s=file("kitchen-webgl-r1050.js")
    for token in ("R1062_RENDER_EMPTY_MESH_SCENE","furnitureGroup.updateMatrixWorld(true)","new THREE.Box3().setFromObject(furnitureGroup)",
                  "webglcontextlost","webglcontextrestored","R1062_WEBGL_RENDER_FAILED","BizetR1062GeometryHealth","camera.far=Math.max"):
        assert token in s
    assert "g.remove(c)" in s

def test_31_wardrobe_real_category_approval_not_kitchen():
    s=file("grande-approval-r1062.js")
    for token in ("GRANDE","TREE_ART_WARDROBE","S.shelvesL","S.shelvesR","S.drawers","S.d","S.h","S.w",
                 "GRANDE · PARAMETRIC EXTERIOR","NOT FOR PRODUCTION","For Approval"):
        assert token in s
    grande=file("grande-r1046.js")
    assert "grandeApprovalR1062" in grande
    assert "grande-approval-r1062.js?v=106202" in file("grande-r1046.html")

def test_32_safari_download_popup_and_errors():
    s=file("point-b.js")
    assert "Acquire Safari popup synchronously" in s
    assert "Safari blocked the drawing window" in s
    assert "60000" in s and "R1062_SAFARI_DOWNLOAD_FAILED" in s

def test_33_computed_theme_contrast_not_name_guessing():
    s=file("contrast-r1062.js")
    assert "getComputedStyle(n)" in s
    assert "blackRatio" in s and "whiteRatio" in s
    assert "theme|palette|language" in s
    assert "contrast-r1062.js?v=106233" in file("workspace-r8.html")

def test_34_35_full_front_oriented_isometry_by_actual_modules():
    s=file("kitchen-webgl-r1050.js")
    assert "FRONT plane derives from actual module walls" in s
    assert "lastOptions.modules.reduce" in s
    assert "for(const x of [bbox.min.x,bbox.max.x])" in s
    assert "Math.max(430,(maxY-minY)*.58" in s

def test_36_37_first_second_sheets_fit_not_overlay():
    s=file("approval-r1062.js")
    assert "w:659,h:258" in s
    assert "w:659,h:326" in s
    assert 'width="345" height="474"' in s
    assert "FRONT VIEW" in s and "LEFT VIEW" in s
    assert "premiumShade" in s

def test_38_slice_live_3d_meshes_no_fake_cross_section():
    s=file("kitchen-webgl-r1050.js")
    assert "function captureApprovalSections()" in s
    assert "geometry.getIndex()" in s
    assert "applyMatrix4(n.matrixWorld)" in s
    assert "THREE_MESH_TRIANGLE_INTERSECTION" in s
    a=file("approval-r1062.js")
    assert "sourceSections()" in a
    assert "REAL MESH SECTIONS" in a
    assert "LIVE MESH SECTION UNAVAILABLE" in a
    for token in ("38.A","38.B","38.C","lower_wall_gap_mm","worktop_thickness_mm","facade_thickness_mm",
                  "plinth_height_mm","UNVERIFIED"):
        assert token in a
    b=file("point-b.js")
    assert "set.detailSheet(modules,room,stamp4,orderRef)" in b
    assert "approvalStamp(page,title,ref,scaleLabel,4)" in b

def test_39_premium_tint_under_lines_not_fake_dimensions():
    s=file("approval-r1062.js")
    assert "premiumShade" in s
    assert "source.color||source.hex||source.value" in s
    assert "font-size" in s and "stroke=" in s

def test_node_js_syntax_and_drawings_synthetic():
    node=shutil.which("node")
    if not node:pytest.skip("Node unavailable")
    names=("kitchen-webgl-r1050.js","approval-r1062.js","point-b.js","contrast-r1062.js","grande-approval-r1062.js")
    for name in names:
        r=subprocess.run([node,"--check",str(STATIC/name)],capture_output=True,text=True)
        assert r.returncode==0,name+" "+r.stderr
    program=r"""
const vm=require('vm'),fs=require('fs');
const context={window:{},console};
vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),context);
const draw=context.window.BizetApprovalR1062;
const mods=[
 {id:'a',number:1,kind:'HINGED',level:'lower',wall:'A',x:0,y:3550,z:100,w:600,d:515,h:700,facade_count:2,facade_openings:['LEFT','RIGHT']},
 {id:'b',number:2,kind:'HINGED',level:'lower',wall:'A',x:600,y:3550,z:100,w:600,d:515,h:700,facade_count:2,facade_openings:['LEFT','RIGHT']},
 {id:'c',number:3,kind:'UPPER',level:'upper',wall:'A',x:0,y:3700,z:1600,w:600,d:320,h:700,facade_count:1}
],room={lengthMm:6000,depthMm:4200,heightMm:2800},stamp=(p,n)=>'<g>'+p+n+'</g>';
const all=[draw.overview(mods,room,stamp,'TEST'),draw.elevation(mods,room,stamp,'TEST'),draw.sections(mods,room,stamp,'TEST'),draw.detailSheet(mods,room,stamp,'TEST')];
if(all.length!==4||!all[3].includes('38.C'))process.exit(2);
if(all.some(s=>!s.includes('</svg>')||!s.includes('viewBox="0 0 1120 790"')))process.exit(3);
"""
    r=subprocess.run([node,"-e",program,str(STATIC/"approval-r1062.js")],capture_output=True,text=True)
    assert r.returncode==0,(r.stderr or "")+" rc="+str(r.returncode)
