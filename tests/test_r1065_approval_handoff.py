"""Owner 10.6.5 handoff: For Approval #38 #39 #47 #48.
These QA checks augment the protected real-WebGL Chromium/WebKit workflow.
"""
from pathlib import Path
import shutil
import subprocess
import pytest
from app.services.documents import build_approval_pdf
ROOT=Path(__file__).resolve().parents[1]
STATIC=ROOT/"app"/"static"

def source(name):
    return (STATIC/name).read_text(encoding="utf-8")

def test_pdf_rejects_partial_and_mixed_revision():
    def svg(revision):
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1120 790"><text x="6" y="20">SNAPSHOT '+revision+'</text><path d="M 10 20 L 900 600" stroke="black"/></svg>'
    with pytest.raises(ValueError,match="STOP_APPROVAL_PAGE_COUNT_INVALID"):
        build_approval_pdf([svg("R1065-1234abcd")])
    with pytest.raises(ValueError,match="STOP_APPROVAL_MIXED_STATE_HASHES"):
        build_approval_pdf([svg("R1065-1234abcd")]*3+[svg("R1065-87654321")])
    with pytest.raises(ValueError,match="STOP_APPROVAL_SVG_MISSING_PAGE_2"):
        build_approval_pdf([svg("R1065-1234abcd"),"broken",svg("R1065-1234abcd"),svg("R1065-1234abcd")])

def test_pdf_has_four_exact_a4_landscape_pages():
    import fitz
    s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1120 790"><text x="80" y="30">SNAPSHOT R1065-1234abcd</text><path d="M 20 70 L 1050 70" stroke="#111"/></svg>'
    binary=build_approval_pdf([s]*4)
    doc=fitz.open("pdf",binary)
    assert len(doc)==4
    for page in doc:
        assert abs(page.rect.width-841.8898)<.1
        assert abs(page.rect.height-595.2756)<.1

def test_generation_uses_frozen_core_and_new_route():
    html=source("workspace-r8.html")
    assert "r1065-approval-capture.js?v=106505" in html
    assert "r1065-approval-drawings.js?v=106505" in html
    assert "r1063-approval-drawings.js?v=" not in html
    sheets=source("r1065-approval-drawings.js")
    for tok in ["uniqueR1065","orthoLeft","orthoTop","orthoFront","COLOURED MATERIAL ELEVATIONS",
                "38.A","38.B","38.C","SNAPSHOT","buildR1065"]:
        assert tok in sheets
    assert "STOP_R1065_APPROVAL_ENGINE_UNAVAILABLE" in source("point-b.js")
    capture=source("r1065-approval-capture.js")
    assert "new THREE.WebGLRenderTarget" in capture
    assert "new THREE.WebGLRenderer" not in capture
    assert "getScissorTest" in capture and "setRenderTarget(oldTarget)" in capture
    assert "role==='FOOT'" in capture

def test_js_syntax_and_parameter_dependent_views():
    node=shutil.which("node")
    if not node:pytest.skip("Node unavailable")
    names=("r1065-approval-capture.js","r1065-approval-drawings.js","point-b.js")
    for name in names:
        p=subprocess.run([node,"--check",str(STATIC/name)],capture_output=True,text=True)
        assert p.returncode==0,name+" "+p.stderr
    sample=r"""
const vm=require('vm'),fs=require('fs');
const room={lengthMm:6000,depthMm:4200,heightMm:2800};
const mods=[
 {id:'M1',number:1,wall:'A',level:'lower',kind:'HINGED',x:120,y:3500,z:100,w:600,d:515,h:700,facade_count:2,facade_openings:['LEFT','RIGHT']},
 {id:'M2',number:2,wall:'A',level:'lower',kind:'HINGED',x:720,y:3500,z:100,w:900,d:515,h:700,facade_count:2,facade_openings:['LEFT','RIGHT']},
 {id:'M3',number:3,wall:'A',level:'upper',kind:'UPPER',x:120,y:3620,z:1460,w:600,d:320,h:780,facade_count:1}
];
const v={furniture_materials:{facade:{color:'#101010'},carcass:{color:'#ac9876'},worktop:{color:'#444444'}}};
const context={window:{BizetApprovalCaptureR1065:{
 snapshot:(modules,room)=>({modules,room,inputs:{worktop_thickness_mm:38},visual:v,stateHash:'R1065-1234abcd'}),
 sectionSlices:()=>[],isometric:()=>null}},console,document:{documentElement:{dataset:{}}}};
vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),context);
const e=context.window.BizetApprovalR1065;
const out=e.build(mods,room,(page,title,ref,scale,total)=>'<g><text>Page '+page+'/'+total+'</text></g>','QA');
if(out.length!==4)throw Error('Expected 4 pages, got '+out.length);
if(!out[0].includes('LEFT VIEW · 1:'))throw Error('Missing LEFT on first sheet');
const scales=['TOP VIEW','FRONT VIEW','LEFT VIEW'].map(key=>out[0].match(new RegExp(key+' · 1:(\\d+)'))?.[1]);
if(scales.some(x=>!x||x!==scales[0]))throw Error('Independent scales '+JSON.stringify(scales));
if(!out[1].includes('COLOURED MATERIAL ELEVATIONS'))throw Error('Color material page missing');
if(!out[1].includes('COLOURED TECHNICAL MATERIALS'))throw Error('Material page purpose missing');
if(!out[0].includes('SNAPSHOT R1065-1234abcd')||out.some(s=>!s.includes('SNAPSHOT R1065-1234abcd')))throw Error('state mismatch');
if(e.unique(mods).length!==3)throw Error('Wrongly merged different widths/constructive types');
"""
    p=subprocess.run([node,"-e",sample,str(STATIC/"r1065-approval-drawings.js")],
      capture_output=True,text=True)
    assert p.returncode==0,p.stderr+" "+str(p.returncode)
