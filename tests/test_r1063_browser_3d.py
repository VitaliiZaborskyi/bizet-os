"""Real Chromium/WebKit GPU smoke gate for BIZET OS R10.6.3.
This is an actual browser/frame test, not a source-string regression.
Use local Three.js copy to avoid third-party CDN dependencies.
Never run against or mutate production user projects.
"""
import io
import os
from pathlib import Path
import statistics
import subprocess
import time
from urllib.request import urlopen
import pytest
pytest.importorskip('PIL', reason='Visual browser tests run in the dedicated protected 3D workflow')
pytest.importorskip('playwright', reason='Visual browser tests run in the dedicated protected 3D workflow')
from PIL import Image, ImageStat
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
DEPS=Path(os.environ.get("BIZET_THREE_NODE_MODULES","/tmp/bizet-3d-deps/node_modules"))/"three"
PORT=18763
URL=f"http://127.0.0.1:{PORT}/static/qa-3d-r1063.html"

@pytest.fixture(scope="module")
def server():
    proc=subprocess.Popen(["python","-m","uvicorn","app.main:app","--host","127.0.0.1","--port",str(PORT)],
                          cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    try:
        for _ in range(80):
            if proc.poll() is not None:
                raise RuntimeError(f"Test API exited early {proc.returncode}")
            try:
                with urlopen(URL, timeout=2) as resp:
                    if resp.status==200:break
            except Exception:
                time.sleep(.25)
        else:raise RuntimeError("Test API not ready")
        yield
    finally:
        proc.terminate()
        try:proc.wait(timeout=4)
        except subprocess.TimeoutExpired:proc.kill()

def local_three_route(route):
    marker="/npm/three@0.128.0/"
    url=route.request.url
    if marker not in url:
        route.abort()
        return
    asset=url.split(marker,1)[1].split("?",1)[0]
    if ".." in asset or not asset.endswith(".js"):
        route.abort()
        return
    p=DEPS/asset
    if not p.is_file():
        route.abort()
        return
    route.fulfill(path=str(p),content_type="application/javascript")

def assert_frame(page,mode,minimum=.008):
    page.evaluate("(m) => window.BizetR1063QA.draw(m)",mode)
    page.wait_for_timeout(950)
    state=page.evaluate("""() => {
      const v=window.BizetKitchenWebGL,qa=window.BizetR1063QA;
      if(!v)return{error:'NO_3D_VIEWER',qa};
      let meshCount=0,furnitureCount=0;v.scene.traverse(o=>{
        if(o.isMesh){meshCount++;if(o.userData?.moduleId==='QA1'||o.userData?.moduleId==='QA2')furnitureCount++}
      });
      const canvas=v.renderer.domElement,rect=canvas.getBoundingClientRect(),context=v.renderer.getContext();
      return {status:qa.status,mode:qa.mode,messages:qa.messages,
       meshCount,furnitureCount,width:rect.width,height:rect.height,
       webgl:!!context,display:getComputedStyle(canvas).display,
       host:getComputedStyle(v.host).display,
       camera:{x:v.camera.position.x,y:v.camera.position.y,z:v.camera.position.z},
       modules:qa.optionsCurrent.modules.length}
    }""")
    assert state.get("status")=="READY", f"{mode}: {state}"
    assert state["webgl"],f"{mode} WebGL context absent: {state}"
    assert state["host"]!="none" and state["display"]!="none",f"{mode} canvas hidden: {state}"
    assert state["width"]>=280 and state["height"]>=280,f"{mode} zero stage: {state}"
    assert state["furnitureCount"]>=3,f"{mode} no actual furniture meshes: {state}"
    assert not state["messages"],f"{mode} browser exception: {state}"
    # Differential pixel proof: keep SAME camera, room and GPU but temporarily hide
    # only the actual construction meshes. A non-blank static background cannot pass.
    canvas=page.locator("#r1050KitchenWebGL canvas")
    with_furniture=Image.open(io.BytesIO(canvas.screenshot())).convert("RGB").resize((128,96))
    hidden=page.evaluate("""() => {
      const v=window.BizetKitchenWebGL,items=[];
      v.scene.traverse(o=>{
        if(o.isMesh&&(o.userData?.moduleId==='QA1'||o.userData?.moduleId==='QA2')){
          items.push(o);o.visible=false;
        }
      });
      window.BizetR1063QA.hidden=items;return items.length;
    }""")
    assert hidden>=3, f"{mode}: no furniture available for image differential"
    page.wait_for_timeout(250)
    no_furniture=Image.open(io.BytesIO(canvas.screenshot())).convert("RGB").resize((128,96))
    page.evaluate("() => {for(const m of window.BizetR1063QA.hidden||[])m.visible=true;window.BizetR1063QA.hidden=[]}")
    page.wait_for_timeout(200)
    delta=[sum(abs(a[i]-b[i]) for i in range(3)) for a,b in zip(with_furniture.getdata(),no_furniture.getdata())]
    contrast_fraction=sum(v>35 for v in delta)/len(delta)
    contrast_mean=sum(delta)/len(delta)
    assert contrast_fraction>=minimum and contrast_mean>1,(
        f"{mode} no visible furniture difference from blank camera: pixels={contrast_fraction:.4f}, mean={contrast_mean:.2f}, state={state}")
    return state

@pytest.mark.parametrize("engine,viewport",[
    ("chromium",{"width":1365,"height":900,"is_mobile":False,"has_touch":False}),
    ("webkit",{"width":1365,"height":900,"is_mobile":False,"has_touch":False}),
    ("webkit",{"width":390,"height":844,"is_mobile":True,"has_touch":True}),
])
def test_real_3d_edit_view_isolation(server,engine,viewport):
    with sync_playwright() as p:
        browser=getattr(p,engine).launch(headless=True,args=["--no-sandbox","--enable-webgl","--use-gl=angle","--use-angle=swiftshader"] if engine=="chromium" else [])
        context=browser.new_context(viewport={k:viewport[k] for k in ["width","height"]},
          is_mobile=viewport["is_mobile"],has_touch=viewport["has_touch"],device_scale_factor=1)
        page=context.new_page()
        page.route("https://cdn.jsdelivr.net/npm/three@0.128.0/**",local_three_route)
        page.goto(URL,wait_until="load",timeout=45000)
        try:
            assert_frame(page,"EDIT")
            assert_frame(page,"VIEW")
            assert_frame(page,"ISOLATION",minimum=.004)
            # Approval export must use the current 3D scene without a second WebGL context.
            export=page.evaluate("""() => {
              const source=window.BizetApprovalCaptureR1063,d=window.BizetApprovalR1063;
              const screenshot=source?.isometric?.();
              const cuts=source?.sectionSlices?.()||[];
              const modules=window.BizetR1063QA.modules;
              const room=window.BizetR1063QA.options.room;
              const stamp=()=>'<g><text>FOR APPROVAL</text></g>';
              const sheets=d&&[
                d.overview(modules,room,stamp,'QA'),
                d.elevation(modules,room,stamp,'QA'),
                d.sections(modules,room,stamp,'QA'),
                d.detailSheet(modules,room,stamp,'QA')
              ];
              return {imageLength:screenshot?.length||0,sections:cuts.length,
                sectionLines:cuts.reduce((n,s)=>n+(s.section_segments?.length||0),0),
                sheets:sheets?.length||0,allSvg:sheets?.every(x=>x.includes('</svg>')),
                sourceLinked:sheets?.[0]?.includes('data:image/png'),webgl:!!window.BizetKitchenWebGL?.renderer.getContext(),
                messages:window.BizetR1063QA.messages};
            }""")
            assert export["imageLength"]>5000, f"3D axonometric capture blank: {export}"
            assert export["sectionLines"]>0, f"No real mesh section contours: {export}"
            assert export["sheets"]==4 and export["allSvg"] and export["sourceLinked"],f"Approval pages invalid: {export}"
            assert export["webgl"] and not export["messages"],f"WebGL damaged by approval export: {export}"
            # Hardest part of #30: the 3D remains visibly present after the export.
            assert_frame(page,"VIEW")
        finally:
            context.close()
            browser.close()

@pytest.mark.parametrize("engine,viewport",[
    ("chromium",{"width":1365,"height":900,"is_mobile":False,"has_touch":False}),
    ("webkit",{"width":390,"height":844,"is_mobile":True,"has_touch":True}),
])
def test_actual_workspace_visible(server,engine,viewport):
    """True /workspace integration, not the isolated QA fixture."""
    with sync_playwright() as p:
        browser=getattr(p,engine).launch(headless=True,args=["--no-sandbox","--enable-webgl","--use-gl=angle","--use-angle=swiftshader"] if engine=="chromium" else [])
        context=browser.new_context(viewport={k:viewport[k] for k in ("width","height")},
            is_mobile=viewport["is_mobile"],has_touch=viewport["has_touch"],device_scale_factor=1)
        page=context.new_page()
        page.route("https://cdn.jsdelivr.net/npm/three@0.128.0/**",local_three_route)
        errors=[]
        page.on("pageerror",lambda e: errors.append(str(e)))
        try:
            # /workspace REQUIRES a real project ID; never test a missing-project URL.
            response=page.request.post(f"http://127.0.0.1:{PORT}/api/v1.1/projects",data={})
            assert response.ok,f"Project fixture creation failed: {response.status} {response.text()[:250]}"
            project_id=response.json()["identity"]["internal_id"]
            page.goto(f"http://127.0.0.1:{PORT}/workspace?project={project_id}",wait_until="domcontentloaded",timeout=60000)
            page.wait_for_function("""() => {
              const r=window.BizetModelRuntime,v=window.BizetKitchenWebGL;
              if(!r?.ready||!v?.renderer?.domElement||!r.getModules?.()?.length)return false;
              let count=0;v.scene.traverse(o=>{
                if(o.isMesh&&r.getModules().some(m=>String(m.id)===String(o.userData?.moduleId)))count++
              });
              return count>=3;
            }""",timeout=35000)
            page.wait_for_timeout(500)
            state=page.evaluate("""() => {
              const v=window.BizetKitchenWebGL,r=window.BizetModelRuntime;
              const modules=r.getModules(),canvas=v.renderer.domElement,b=canvas.getBoundingClientRect();
              let count=0;v.scene.traverse(o=>{
                if(o.isMesh&&modules.some(m=>String(m.id)===String(o.userData?.moduleId)))count++;
              });
              return {ready:r.ready,modules:modules.length,meshes:count,webgl:!!v.renderer.getContext(),
                width:b.width,height:b.height,display:getComputedStyle(v.host).display,
                coreVersion:v.version,roomAdapter:!!window.BizetRoomR1063,
                drawings:!!window.BizetApprovalR1063,
                visual:!!window.BizetVisualR1063};
            }""")
            assert state["ready"] and state["modules"]>=1 and state["meshes"]>=3, state
            assert state["width"]>250 and state["height"]>200 and state["webgl"],state
            assert state["display"]!="none",state
            assert state["coreVersion"]=="R10.6.0",f"Protected 3D core changed: {state}"
            assert state["roomAdapter"] and state["drawings"] and state["visual"],state
            assert not errors,f"Actual workspace browser errors: {errors[:8]}"
        finally:
            context.close()
            browser.close()
