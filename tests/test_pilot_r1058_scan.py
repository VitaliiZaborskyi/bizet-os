"""BIZET OS 10.5.8 — source-preserving Polycam scan pilot smoke/contracts.

The test suite must NOT claim geometric reconstruction or client device QA.
Image provider 10.5.7 remains paused and unchanged.
"""
from pathlib import Path
import shutil
import subprocess

from fastapi.testclient import TestClient
from app.main import app

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "app" / "static"
client = TestClient(app)


def read(name: str) -> str:
    return (STATIC / name).read_text(encoding="utf-8")


def test_scan_route_is_live_and_contains_two_paths_and_real_full_glb_viewer():
    response = client.get("/scan")
    assert response.status_code == 200
    html = response.text
    for item in [
        'id="scanChooseImport"', 'id="scanChooseProvider"',
        'id="scanFileInput"', 'id="scanViewport"',
        'id="scanTop"', 'id="scanOrbit"',
        'id="scanRotateLeft"', 'id="scanRotateRight"',
        'id="scanMirrorHorizontal"', 'id="scanSaveRegistration"',
        '/static/scan-r1058.js?v=1059',
        '/static/scan-r1058.css?v=1059',
        'examples/js/loaders/GLTFLoader.js'
    ]:
        assert item in html, item
    assert response.headers.get("cache-control") == "no-cache"
    assert 'Файлы не отправляются на сервер' in html


def test_start_scan_button_now_opens_r1058_not_old_wip():
    start = read("start-room-handoff.js")
    index = read("index.html")
    workspace = read("workspace-r8.js")
    assert "startScanButton" in start
    assert "window.location.assign('/scan'" in start
    assert "Скан — в стадии разработки." not in start
    assert "start-room-handoff.js?v=1058" in index
    assert "if(a==='room-source-scan')" in workspace
    assert "window.location.assign('/scan'" in workspace
    assert 'window.location.assign' in start
    assert "startUploadFileButton" in start  # Existing PDF/photo route untouched.
    assert "room-source-manual" in workspace  # Template mode untouched.


def test_source_scan_is_full_textured_mesh_not_sparse_line_reference():
    js = read("scan-r1058.js")
    for token in [
        "new engine.THREE.GLTFLoader(manager)",
        "loader.parse(bytes",
        "scanObject=model.scene",
        "map:mat.map||null",
        "mat.map=textureOn?mat.userData.bizetInitial.map:null",
        "scanObject.position.sub(",
        "orientationGroup.add(scanObject)",
        "renderer.toneMapping=THREE.ACESFilmicToneMapping",
        "textureOn", "wireOn",
        "new THREE.Box3"
    ]:
        # Box3 may be created with local THREE alias e.THREE.
        if token == "new THREE.Box3":
            assert "new e.THREE.Box3" in js
        else:
            assert token in js, token
    assert "MAX_REFERENCE_SEGMENTS" not in js
    assert "MAX_TRIANGLES_PER_PRIMITIVE" not in js


def test_up_axis_orientation_plan_rotation_and_user_mirror_are_explicit():
    js=read("scan-r1058.js")
    assert "e.camera.up.set(0,0,-1)" in js
    assert "From POSITIVE Y" in js
    assert "quarter_turns" in js
    assert "orient.mirror_x=!orient.mirror_x" in js
    assert "orient.quarter_turns=(orient.quarter_turns+1)%4" in js
    assert "setCamera('TOP')" in js
    assert "e.orientationGroup.worldToLocal" in js
    assert "engineering_mapping:'PENDING_OWNER_CONFIRMATION'" in js


def test_generic_wall_list_is_unbounded_and_preserves_legacy_example():
    js=read("scan-r1058.js")
    html=read("scan-r1058.html")
    for token in [
        "function createWall(", "function resetWallDefinitions(", "paintWallButtons()",
        "wallIds.push(id)", "createWall();", "function selectRole(",
        "wall_definitions:wallIds.map", "if(!marks.some(",
        "PROTRUSION_FACE", "PRIMARY_WALL",
        "OLD_SAMPLE_ROLES", "onchange=e=>",
        "document.createElement('button')",
    ]:
        assert token in js, token
    assert 'id="scanAddWall"' in html
    assert 'id="scanRoleGrid"' in html
    assert 'id="scanWallLabel"' in html
    assert 'id="scanWallKind"' in html
    assert 'data-scan-anchor="ENTRY"' in html
    assert 'data-scan-anchor="TURN_CABINET"' not in html
    assert 'data-scan-role="A"' not in html  # no forced four walls
    assert "Отметь основные стены В и Г" not in js

def test_polycam_zip_is_direct_local_upload_with_archive_guardrails():
    html=read("scan-r1058.html")
    js=read("scan-r1058.js")
    assert ".zip,.glb,.gltf" in html
    assert 'id="scanArchiveModel"' in html
    assert "fflate@0.8.3/umd/index.js" in html
    for token in ["inspectZipCentralDirectory","MAX_UNPACKED_BYTES",
                  "MAX_ZIP_ENTRIES","UNSAFE_ZIP_FILE_PATH","fflate.unzip(",
                  "selectArchiveModel(", "archiveModels.length<2"]:
        assert token in js, token
    assert "Архив ZIP сначала распакуй" not in js
    assert "https://poly.cam/" in js
    assert "https://apps.apple.com/app/id1532482376" in html
    assert "POLYCAM:{ios:'https://apps.apple.com" not in js
    assert "Гарантированный deep-link не подтверждён" in html


def test_client_storage_is_preview_only_with_no_production_geometry_mutation():
    js=read("scan-r1058.js")
    assert "scene.visual_settings.scan_registration_r1058" in js
    assert "STATUS_UNVERIFIED" not in js
    assert "PRELIMINARY_UNVERIFIED" in js
    assert "STOP_UNCONFIRMED_SCANNED_GEOMETRY" in js
    assert "production_ready:false" in js
    assert "confirmed:false" in js
    assert "CLIENT_ONLY_NOT_UPLOADED" in js
    assert "crypto.subtle.digest('SHA-256'" in js
    assert "room.geometry.wall_length" not in js
    assert "room.geometry.wall_depth" not in js
    assert "room.geometry.room_height" not in js
    assert "/api/v1.1/visualization/generate" not in js


def test_project_can_store_unconfirmed_spatial_registration_separately():
    response=client.post("/api/v1.1/projects",json={})
    assert response.status_code==200, response.text
    pid=response.json()["identity"]["internal_id"]
    before=client.get("/api/v1.1/projects/"+pid).json()
    geometry_before=before["room"]["geometry"]
    value={
        "schema": "BIZET_SCAN_REGISTRATION_R10_5_8",
        "status": "PRELIMINARY_UNVERIFIED",
        "source": {"file_name": "13.08.2026.glb", "sha256": "a"*64, "storage": "CLIENT_ONLY_NOT_UPLOADED"},
        "orientation": {"quarter_turns": 3, "mirror_x": True},
        "segments": [
            {"role":"A","kind":"PROTRUSION_FACE","points":[[0.0,0.0],[1.0,0.0]],"unit":"M","confirmed":False},
            {"role":"B","kind":"PROTRUSION_FACE","points":[[1.0,0.0],[2.0,0.0]],"unit":"M","confirmed":False},
            {"role":"V","kind":"PRIMARY_WALL","points":[[0.0,1.0],[4.0,1.0]],"unit":"M","confirmed":False},
            {"role":"G","kind":"PRIMARY_WALL","points":[[4.0,1.0],[4.0,3.0]],"unit":"M","confirmed":False},
        ],
        "production_ready": False,
        "export_stop": "STOP_UNCONFIRMED_SCANNED_GEOMETRY",
    }
    patch=client.patch("/api/v1.1/projects/"+pid,json={
        "path":"scene.visual_settings.scan_registration_r1058",
        "value": value,
        "source":"IMPORTED",
        "confirmed":False,
        "reason":"10.5.8 user-confirmation-only semantic mapping"})
    assert patch.status_code==200, patch.text
    after=client.get("/api/v1.1/projects/"+pid).json()
    assert after["scene"]["visual_settings"]["scan_registration_r1058"]["source"]["sha256"]=="a"*64
    assert after["scene"]["visual_settings"]["scan_registration_r1058"]["production_ready"] is False
    assert after["room"]["geometry"]==geometry_before
    assert after["scene"]["visual_settings"]["scan_registration_r1058"]["segments"][2]["role"]=="V"


def test_legacy_scan_paths_and_visualization_are_preserved():
    room=read("room-latest.js")
    for token in ["function parseGlb", "function extractScanContour", "scanApplyDimensions", "POLYCAM", "SKETCHUP"]:
        assert token in room
    main=(ROOT/"app"/"main.py").read_text(encoding="utf-8")
    assert 'version="R10.5.8"' in main
    visual=read("visualization-r1055.js")
    assert "const API='/api/v1.1/visualization'" in visual
    assert "fetch(API+'/status'" in visual


def test_new_10_5_8_source_javascript_syntax_node():
    node=shutil.which("node")
    if node is None:
        import pytest
        pytest.skip("Node not installed")
    for name in ["scan-r1058.js","start-room-handoff.js","workspace-r8.js"]:
        check=subprocess.run([node,"--check",str(STATIC/name)],capture_output=True,text=True)
        assert check.returncode==0, name+": "+check.stderr
