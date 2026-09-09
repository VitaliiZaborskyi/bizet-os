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
    assert 'Коммуникации и особенности помещения' in response.text


def test_start_summary_handoff_opens_room_route():
    html = (ROOT / 'app/static/index.html').read_text(encoding='utf-8')
    handoff = (ROOT / 'app/static/start-room-handoff.js').read_text(encoding='utf-8')
    assert '/static/start-room-handoff.js' in html
    assert "window.location.assign('/room')" in handoff


def test_room_camera_is_persisted_in_project_scene():
    js = (ROOT / 'app/static/room.js').read_text(encoding='utf-8')
    assert "path:'scene.camera'" in js or "path: 'scene.camera'" in js
    assert 'BUILD 1.1-D viewport camera' in js


def test_room_viewport_supports_mouse_touch_and_zoom_without_external_3d_dependency():
    js = (ROOT / 'app/static/room.js').read_text(encoding='utf-8')
    assert "addEventListener('pointerdown'" in js
    assert "addEventListener('pointermove'" in js
    assert "addEventListener('wheel'" in js
    assert 'pinchStart' in js
    assert 'three.js' not in js.lower()


def test_room_orbit_is_inverted_for_pointer_drag():
    js = (ROOT / 'app/static/room.js').read_text(encoding='utf-8')
    assert 'dragStart.yaw-dx*.005' in js
    assert 'dragStart.pitch+dy*.004' in js
    assert 'Inverted orbit' in js


def test_room_uses_single_quest_summary_dropdown():
    html = (ROOT / 'app/static/room.html').read_text(encoding='utf-8')
    js = (ROOT / 'app/static/room.js').read_text(encoding='utf-8')
    assert 'id="questSummaryButton"' in html
    assert 'id="questSummaryPanel"' in html
    assert 'id="questSummaryList"' in html
    assert "summary: 'Ваш выбор'" in js
    assert 'context-chip' not in html


def test_room_surfaces_are_labelled_and_clickable_for_dimensions():
    html = (ROOT / 'app/static/room.html').read_text(encoding='utf-8')
    js = (ROOT / 'app/static/room.js').read_text(encoding='utf-8')
    assert 'id="dimensionDialog"' in html
    assert 'id="dimensionPrimary"' in html
    assert 'id="dimensionSecondary"' in html
    for surface in ["'A'", "'B'", "'C'", "'D'", "'FLOOR'"]:
        assert surface in js
    assert 'surfaceAtPoint' in js
    assert 'openSurfaceEditor' in js


def test_default_dimensions_are_visible_and_geometry_updates_use_project_state():
    html = (ROOT / 'app/static/room.html').read_text(encoding='utf-8')
    js = (ROOT / 'app/static/room.js').read_text(encoding='utf-8')
    assert '6000 × 4200 × H 2800 mm' in html
    assert 'lengthMm: 6000' in js
    assert 'widthMm: 4200' in js
    assert 'heightMm: 2800' in js
    assert "patchGeometry('room.geometry.wall_length'" in js
    assert "patchGeometry('room.geometry.wall_depth'" in js
    assert "patchGeometry('room.geometry.room_height'" in js
    assert "source:'USER_ENTERED'" in js


def test_dimension_inputs_preview_room_immediately_and_save_closes_dialog():
    html = (ROOT / 'app/static/room.html').read_text(encoding='utf-8')
    js = (ROOT / 'app/static/room.js').read_text(encoding='utf-8')
    assert '3D меняется сразу при вводе значения.' in html
    assert "$('dimensionPrimary').addEventListener('input',previewDimensionInputs)" in js
    assert "$('dimensionSecondary').addEventListener('input',previewDimensionInputs)" in js
    assert 'renderDimensionSummary(); drawRoom();' in js
    assert 'closeDimensionEditor(true)' in js
    assert 'Сохранить данные' in html


def test_dimension_lines_have_visibility_toggle_and_persist_view_setting():
    html = (ROOT / 'app/static/room.html').read_text(encoding='utf-8')
    js = (ROOT / 'app/static/room.js').read_text(encoding='utf-8')
    assert 'id="dimensionsToggleButton"' in html
    assert 'id="dimensionsToggleState"' in html
    assert 'drawRoomDimensions' in js
    assert 'show_dimensions' in js
    assert "patchState('scene.visual_settings'" in js


def test_ceiling_selector_has_four_frozen_types_and_updates_project_state():
    html = (ROOT / 'app/static/room.html').read_text(encoding='utf-8')
    js = (ROOT / 'app/static/room.js').read_text(encoding='utf-8')
    assert 'id="ceilingButton"' in html
    assert 'id="ceilingMenu"' in html
    for ceiling_type in ['STRETCH_A', 'STRETCH_B', 'GYPSUM', 'OPEN_GAP']:
        assert ceiling_type in html
        assert ceiling_type in js
    assert "patchState('room.ceiling'" in js
    assert 'ceilingFill' in js


def test_scan_button_exposes_polycam_and_sketchup_official_channels():
    html = (ROOT / 'app/static/room.html').read_text(encoding='utf-8')
    js = (ROOT / 'app/static/room.js').read_text(encoding='utf-8')
    assert 'id="scanButton"' in html
    assert 'id="scanDialog"' in html
    assert 'data-scan-provider="POLYCAM"' in html
    assert 'data-scan-provider="SKETCHUP"' in html
    assert 'https://apps.apple.com/app/id1532482376' in js
    assert 'https://play.google.com/store/apps/details?id=ai.polycam' in js
    assert 'https://apps.apple.com/app/id796352563' in js
    assert 'https://app.sketchup.com/' in js
    assert 'platformKind' in js


def test_next_step_route_opens_communications_and_room_features_shell():
    response = client.get('/room-elements')
    assert response.status_code == 200
    assert 'Коммуникации и конструкционные особенности' in response.text
    assert 'Канализация' in response.text
    assert 'Вода' in response.text
    assert 'Питание варочной / духовки' in response.text
    assert 'Окно' in response.text
    assert 'Дверь' in response.text
    js = (ROOT / 'app/static/room.js').read_text(encoding='utf-8')
    assert "window.location.assign('/room-elements')" in js


def test_room_viewport_keeps_global_settings_entry_points():
    html = (ROOT / 'app/static/room.html').read_text(encoding='utf-8')
    for ident in ['settingsButton', 'themeSelect', 'languageSelect', 'feedbackButton', 'tutorialButton', 'loginButton', 'registerButton']:
        assert f'id="{ident}"' in html
