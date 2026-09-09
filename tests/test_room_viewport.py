from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app


ROOT = Path(__file__).resolve().parents[1]
client = TestClient(app)


def test_room_route_serves_interactive_viewport():
    response = client.get('/room')
    assert response.status_code == 200
    assert 'id="roomCanvas"' in response.text
    assert '/static/room.js' in response.text
    assert 'Начать замер помещения' in response.text


def test_start_summary_handoff_opens_room_route():
    html = (ROOT / 'app/static/index.html').read_text(encoding='utf-8')
    handoff = (ROOT / 'app/static/start-room-handoff.js').read_text(encoding='utf-8')
    assert '/static/start-room-handoff.js' in html
    assert "window.location.assign('/room')" in handoff


def test_room_viewport_does_not_fake_measurement_inputs():
    html = (ROOT / 'app/static/room.html').read_text(encoding='utf-8')
    js = (ROOT / 'app/static/room.js').read_text(encoding='utf-8')
    assert 'ASK_ROOM_WALL_LENGTH' not in html
    assert 'ASK_ROOM_WALL_LENGTH' not in js
    assert 'room.geometry.wall_length' not in js
    assert 'Размеры и элементы помещения появятся на следующем этапе замера.' in html


def test_room_camera_is_persisted_in_project_scene_only():
    js = (ROOT / 'app/static/room.js').read_text(encoding='utf-8')
    assert "path: 'scene.camera'" in js
    assert 'BUILD 1.1-D viewport camera' in js
    assert "path: 'room.geometry" not in js


def test_room_viewport_keeps_global_settings_entry_points():
    html = (ROOT / 'app/static/room.html').read_text(encoding='utf-8')
    for ident in ['settingsButton', 'themeSelect', 'languageSelect', 'feedbackButton', 'tutorialButton', 'loginButton', 'registerButton']:
        assert f'id="{ident}"' in html
