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
from PIL import Image, ImageStat
import pytest
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
    png=page.locator("#r1050KitchenWebGL canvas").screenshot()
    image=Image.open(io.BytesIO(png)).convert("RGB")
    # More than an empty flat background; pixels must contain real rendered furniture.
    small=image.resize((96,70))
    stat=ImageStat.Stat(small)
    contrast=sum(stat.stddev)/3
    bg=(52,56,61)
    different=sum(1 for pixel in small.getdata() if sum(abs(pixel[i]-bg[i]) for i in range(3))>65)
    fraction=different/(96*70)
    assert contrast>9 and fraction>=minimum,f"{mode} scene looks empty: std={contrast}, changed={fraction}, state={state}"
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
        finally:
            context.close()
            browser.close()
