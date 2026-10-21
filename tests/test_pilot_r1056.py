"""BIZET OS 10.5.6 owner acceptance, contract and safety checks.

Source tests verify required wiring; they do not substitute for visual iPhone QA,
factory Quadro tests or live paid image provider acceptance.
"""
from pathlib import Path
import os
import shutil
import subprocess
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from app.main import app

ROOT=Path(__file__).resolve().parents[1]
STATIC=ROOT/"app"/"static"
def read(name):return (STATIC/name).read_text(encoding="utf-8")

def test_01_02_reference_handle_is_rectangular_and_perpendicular_to_wall_normal():
    v=read("kitchen-webgl-r1050.js")
    assert "HANDLE_REFERENCE_20261020" in v
    assert "new THREE.BoxGeometry(railLength,railHeight,railDepth)" in v
    assert "new THREE.CylinderGeometry(5,5" not in v
    assert "wall==='A'?Math.PI:wall==='B'?Math.PI/2:-Math.PI/2" in v
    assert "addHandleBar(p,false,hardwareGroup,wall)" in v

def test_03_full_width_desktop_edit_and_isolation():
    html=read("workspace-r8.html")
    css=read("r1050.css")
    assert "@media(min-width:821px)" in html
    assert "body.r10-module-focus #modelStage" in html
    assert "r1056-edit-mode" in html and "r1056-edit-mode" in css

def test_04_05_selected_floor_wall_board_map_not_just_css_color():
    js=read("kitchen-webgl-r1050.js")
    workspace=read("workspace-r8.js")
    for x in ["function r1056Texture","function r1056MaterialTexture","r1056MaterialTexture(fm,'floor'",
              "r1056MaterialTexture(wm,'walls'","r1056MaterialTexture(body,'carcass'","r1056MaterialTexture(front,'facade'"]:
        assert x in js
    for x in ["PARQUET:{","TILE:{","PLASTER:{","carcass:{title:","materialButton('floor')","materialButton('walls')"]:
        assert x in workspace

def test_06_07_supports_and_real_centered_plinth_grille_cutout():
    js=read("kitchen-webgl-r1050.js")
    assert "recess+38" in js
    assert "function addFloorPlinth" in js
    for token in ["PLINTH_GRILLE_LEFT","PLINTH_GRILLE_RIGHT","PLINTH_GRILLE_BELOW","PLINTH_GRILLE_ABOVE",
                  "run-center", "460","60","['FRIDGE','TALL_OVEN'].includes(m.kind)"]:
        if token=="run-center": assert "run_center_mm:run/2" in js
        else: assert token in js
    assert "'fridge-plinth-grille'" not in js
    assert "STOP_UNVERIFIED_PLINTH_GRILLE_CUTOUT_460X60" in read("production-r1050.js")

def test_08_09_two_door_hinges_and_flat_roofless_base():
    model=read("model.js")
    scene=read("kitchen-webgl-r1050.js")
    bom=read("point-b.js")
    assert "m.facade_openings=(count===2&&m.kind==='HINGED')?['LEFT','RIGHT']" in model
    assert "const hasTop=!ordinaryBase||explicitTop" in scene
    assert "'FRONT_STRETCHER'" in scene and "'REAR_STRETCHER'" in scene
    assert "'Rail Front',inner,100" in bom and "'Rail Back',inner,100" in bom

def test_10_view_lighting_kelvin_gradient_and_disabled_when_not_configured():
    html=read("workspace-r8.html");js=read("workspace-r8.js");scene=read("kitchen-webgl-r1050.js")
    assert 'id="r1056ViewLighting"' in html
    assert "button.disabled=!enabled" in js
    assert "materialButton('floor')" in js
    assert "data-input=\"lighting_kelvin\"" in js
    for token in ["function makeR1056Glow","gradient.addColorStop(1","r1056LightingVisible","setLightingVisible:v=>"]:
        assert token in scene

def test_11_corner_overlap_detection_and_worktop_subtraction():
    model=read("model.js");scene=read("kitchen-webgl-r1050.js");p=read("production-r1050.js")
    for term in ["cornerReserve=Math.min(full,lowerDepth()+lowerWallGap())","function inspectPhysicalIntersections","BizetR1056Collisions"]:
        assert term in model
    for term in ["function r1056SubtractRect","function r1056WorktopMesh","R1056WorktopClips","CORNER_PERPENDICULAR_FALSE_40"]:
        assert term in scene
    assert "STOP_MODULE_INTERSECTION" in p and "STOP_UNAPPROVED_WORKTOP_CORNER_CLIP" in p

def test_12_dishwasher_opens_outward_from_perpendicular_walls():
    scene=read("kitchen-webgl-r1050.js")
    assert "m.pivot.rotation.x=-m.current*Math.PI*.48" in scene
    assert "m.pivot.rotation.z=(m.wall==='B'?-1:1)*m.current*Math.PI*.48" in scene

def test_13_fixed_shelf_has_visible_controls_in_isolation():
    model=read("model.js")
    assert "r1056-shelf-controls" in model
    assert "data-r1056-shelf-index" in model
    assert "bizet:shelfhold" in model
    assert "STOP_PROFILE_REQUIRED" in model

def test_14_grande_left_rotation_keyboard_and_second_cabinet():
    html=read("grande-r1046.html");js=read("grande-r1048.js")
    for term in [".r1055-object-rotation{position:absolute;left:12px","id=\"rotateObjectLeft\"","id=\"rotateObjectRight\""]:
        assert term in html
    assert "const event=el.type==='color'?'input':'change'" in js
    assert "syncSecondaryScene()" in js and "sceneCopiesGroup" in js
    assert "extraGrandeCount=1" in js
    assert "if(extraGrandeCount){toast" in js

def test_15_visualization_visible_and_provider_not_fake():
    html=read("workspace-r8.html");js=read("visualization-r1055.js")
    server=(ROOT/"app"/"api"/"visualization_r1056.py").read_text(encoding="utf-8")
    assert 'data-panel="general"' in html  # only menu 07 entry
    assert 'id="openVisualizationTop"' in html
    assert "readonly aria-readonly" in js
    assert "referenceCapture()" in js and "const API=\'/api/v1.1/visualization\'" in js and "fetch(API+\'/generate\'" in js
    assert 'https://api.openai.com/v1/images/edits' in server
    assert "OPENAI_API_KEY" in server and "BIZET_VISUALIZATION_ACCESS_CODE" in server
    assert "engineering_verified" in server

def test_backend_owner_guard_and_configuration_status():
    with patch.dict(os.environ, {}, clear=True):
        c=TestClient(app)
        r=c.get("/api/v1.1/visualization/status");assert r.status_code==200 and not r.json()["ready"]
        denied=c.post("/api/v1.1/visualization/generate",json={"scene":{},"reference_image":"data:image/png;base64,"+("A"*200)})
        assert denied.status_code==503
    with patch.dict(os.environ,{"OPENAI_API_KEY":"DUMMY_TEST_NOT_REAL","BIZET_VISUALIZATION_ACCESS_CODE":"OWNER_TEST_CODE"},clear=True):
        c=TestClient(app);assert c.get("/api/v1.1/visualization/status").json()["ready"] is True
        denied=c.post("/api/v1.1/visualization/generate",headers={"X-Bizet-Visualization-Code":"WRONG"},json={"scene":{},"reference_image":"data:image/png;base64,"+("A"*200)})
        assert denied.status_code==403

def test_node_syntax_all_modified_js():
    node=shutil.which("node")
    if not node:pytest.skip("Node unavailable")
    for name in ["model.js","workspace-r8.js","grande-r1048.js","kitchen-webgl-r1050.js","visualization-r1055.js","point-b.js","production-r1050.js"]:
        p=subprocess.run([node,"--check",str(STATIC/name)],capture_output=True,text=True)
        assert p.returncode==0,name+": "+p.stderr
