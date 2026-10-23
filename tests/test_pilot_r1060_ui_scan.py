"""10.6.0 owner change-set smoke contracts. Manual Safari and real Polycam QA remain required."""
from pathlib import Path
import shutil
import subprocess
import pytest
from fastapi.testclient import TestClient
from app.main import app

STATIC = Path(__file__).resolve().parents[1] / "app" / "static"
def src(name): return (STATIC/name).read_text(encoding="utf-8")

def test_entry_routes_and_scanner_to_editor():
    client = TestClient(app)
    assert client.get("/scan").status_code == 200
    assert client.get("/workspace").status_code == 200
    scan=src("scan-r1058.js")
    html=src("scan-r1058.html")
    assert 'id="scanContinueToRoom">Загрузить стены в проект' in html
    assert "location.assign('/workspace'" in scan
    assert "await saveRegistration()" in scan
    assert "scan_import_r1060" in scan
    assert "STOP_UNCONFIRMED_SCANNED_GEOMETRY" in scan
    assert "room.geometry.wall_length" not in scan
    assert "room.geometry.wall_depth" not in scan

def test_preliminary_walls_render_in_same_editable_workspace():
    ws=src("workspace-r8.js")
    viewer=src("kitchen-webgl-r1050.js")
    assert "setKitchenUiMode('EDIT')" in ws
    assert "setKitchenUiMode('VIEW');\n $('workspaceLanguageSelect')" not in ws
    assert "bindScanWallEditors()" in ws
    assert "data-scan-wall" in ws
    assert "scan_import_r1060" in ws and "BizetRoomR1061.renderWalls" in viewer and "scan_import_r1060" in src("room-r1061.js")
    assert "scan-wall-r1061" in src("room-r1061.js")
    assert "productionReady:false" in src("room-r1061.js")

def test_clean_owner_panels_keep_actual_functionality():
    ws=src("workspace-r8.js")
    for fragment in (
        "Три входа приводятся к единой Room Model.",
        "В шаблонной конфигурации ПММ обязательна и ставится рядом с мойкой.",
        "Стандарт: столешница 600 мм",
        "На данном этапе три конструкции являются визуальными proxy",
        "Ящики и подъёмные фасады: горизонтально по центру",
        "Можно одновременно выбрать несколько зон.",
        "Один инженерный BIZET Model →",
        "DWG / DXF / GLB / развёртки",
    ):
        # Locale dictionaries can retain historic translations; they must not be injected in rendered panel templates.
        rendered=ws[ws.index("function renderPanel("):ws.index("function classifyRoomFile(")]
        assert fragment not in rendered
    assert "dishwasher_type" in ws and "dish_dryer_variant" in ws
    assert "exportProjectR1050" in ws and "r10RoomFileInput" in ws
    assert "Для воды" in ws

def test_marble_free_orbit_and_desktop_safari_styles():
    js=src("kitchen-webgl-r1050.js")
    css=src("r1060.css")
    workspace=src("workspace-r8.html")
    index=src("index.html")
    assert "TILE_MARBLE_WHITE" in js
    assert "ctx.strokeStyle='#a9aaa9'" in js
    assert "controls.minAzimuthAngle=-Infinity" in js
    assert "controls.enableRotate=true" in js
    assert "#FFFFFF!important" in css
    assert "body.r8-workspace-body.r10-module-focus #workspaceTools" in css
    assert "overflow-y:auto!important" in css
    assert "r1060.css" in workspace and "r1060.css" in index

def test_modified_javascript_syntax_node():
    node=shutil.which("node")
    if not node:
        pytest.skip("Node unavailable")
    for name in ("scan-r1058.js","workspace-r8.js","kitchen-webgl-r1050.js"):
        check=subprocess.run([node,"--check",str(STATIC/name)],capture_output=True,text=True)
        assert check.returncode==0, name+" "+check.stderr
