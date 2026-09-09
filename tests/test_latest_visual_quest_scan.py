from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app


ROOT = Path(__file__).resolve().parents[1]
client = TestClient(app)


def test_view_cube_is_temporarily_hidden_but_360_orbit_remains():
    html = (ROOT / 'app/static/room.html').read_text(encoding='utf-8')
    css = (ROOT / 'app/static/room-latest.css').read_text(encoding='utf-8')
    js = (ROOT / 'app/static/room-v2.js').read_text(encoding='utf-8')
    assert 'id="viewCubeShell"' in html
    assert '#viewCubeShell { display: none !important; }' in css
    assert 'wrapAngle(dragStart.yaw-dx*.005)' in js
    assert 'wrapAngle(dragStart.pitch+dy*.004)' in js


def test_scan_button_has_two_client_paths_and_gltf_glb_file_picker():
    html = (ROOT / 'app/static/room.html').read_text(encoding='utf-8')
    js = (ROOT / 'app/static/room-latest.js').read_text(encoding='utf-8')
    assert '/static/room-latest.js' in html
    assert 'У меня уже есть скан' in js
    assert 'Мне нужно отсканировать' in js
    assert 'accept=".gltf,.glb' in js
    assert 'scanFileInput' in js
    assert 'Загружаем' in js and 'Распознаём геометрию' in js and 'Накладываем на 3D' in js


def test_scan_pilot_reads_gltf_glb_geometry_and_requires_explicit_apply():
    js = (ROOT / 'app/static/room-latest.js').read_text(encoding='utf-8')
    assert 'parseGlbJson' in js
    assert 'analyzeGltf' in js
    assert 'extractGeometryPreview' in js
    assert 'readAccessor' in js
    assert "ext[0]*1000" in js
    assert "ext[2]*1000" in js
    assert "ext[1]*1000" in js
    assert 'scanApplyDimensions' in js
    assert "source:'IMPORTED'" in js
    assert 'scene.visual_settings.scan_import' in js
    assert 'geometry_preview' in js


def test_scan_download_path_keeps_polycam_and_sketchup_provider_options():
    js = (ROOT / 'app/static/room-latest.js').read_text(encoding='utf-8')
    assert 'https://apps.apple.com/app/id1532482376' in js
    assert 'https://play.google.com/store/apps/details?id=ai.polycam' in js
    assert 'https://apps.apple.com/app/id796352563' in js
    assert 'https://app.sketchup.com/' in js
    assert 'devicePlatform' in js


def test_furniture_configuration_is_presented_as_visual_quest_not_visible_dropdown():
    response = client.get('/room-elements')
    assert response.status_code == 200
    html = response.text
    js = (ROOT / 'app/static/room-elements-latest.js').read_text(encoding='utf-8')
    css = (ROOT / 'app/static/room-elements-latest.css').read_text(encoding='utf-8')
    assert '/static/room-elements-latest.js' in html
    assert 'visualConfigQuest' in js
    assert 'visual-config-card' in js
    for code in ['WALL_CENTER', 'WALL_LEFT', 'WALL_RIGHT', 'L_LEFT', 'L_RIGHT', 'U_SHAPE', 'CUSTOM']:
        assert code in js
    assert 'is-compatibility-only' in css
    assert "select.dispatchEvent(new Event('change'" in js


def test_visual_quest_keeps_custom_plan_and_existing_wall_workflow():
    html = (ROOT / 'app/static/room-elements.html').read_text(encoding='utf-8')
    assert 'id="customPlanDialog"' in html
    assert 'id="communicationCanvas"' in html
    assert 'id="emptyWallButton"' in html
    assert 'id="positionDimensionsToggle"' in html
