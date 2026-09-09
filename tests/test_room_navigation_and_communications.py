from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

ROOT = Path(__file__).resolve().parents[1]
client = TestClient(app)


def test_room_uses_360_runtime_and_view_cube():
    html = (ROOT / 'app/static/room.html').read_text(encoding='utf-8')
    js = (ROOT / 'app/static/room-v2.js').read_text(encoding='utf-8')
    assert '/static/room-v2.js' in html
    assert 'id="viewCube"' in html
    for preset in ['front', 'back', 'left', 'right', 'top', 'bottom', 'isoNW', 'isoNE', 'isoSW', 'isoSE']:
        assert f'data-view-preset="{preset}"' in html
    assert 'wrapAngle(dragStart.yaw-dx*.005)' in js
    assert 'wrapAngle(dragStart.pitch+dy*.004)' in js
    assert 'Stable spherical basis' in js
    assert 'animateCameraTo' in js
    assert 'clamp(dragStart.pitch' not in js


def test_view_cube_is_synchronized_with_camera():
    js = (ROOT / 'app/static/room-v2.js').read_text(encoding='utf-8')
    assert 'function updateViewCube()' in js
    assert 'rotateX(' in js
    assert 'rotateY(' in js
    assert 'viewCubeReadout' in js
    assert 'VIEW_PRESETS' in js


def test_furniture_configuration_choices_match_owner_flow():
    html = (ROOT / 'app/static/room-elements.html').read_text(encoding='utf-8')
    assert 'Вдоль стены по центру' in html
    assert 'Вдоль стены в левом углу' in html
    assert 'Вдоль стены в правом углу' in html
    assert 'Буквой «Г» — длинное крыло влево' in html
    assert 'Буквой «Г» — длинное крыло вправо' in html
    assert 'Буквой «П»' in html
    assert 'Кастомная конфигурация' in html
    assert 'id="configurationSelect"' in html
    assert 'id="configurationPreview"' in html


def test_custom_configuration_has_draw_recognize_and_wall_labels():
    html = (ROOT / 'app/static/room-elements.html').read_text(encoding='utf-8')
    js = (ROOT / 'app/static/room-elements-v2.js').read_text(encoding='utf-8')
    assert 'id="customPlanCanvas"' in html
    assert 'id="customDetectedWalls"' in html
    assert 'recognizeCustomWalls' in js
    assert "WALL_ORDER = ['B','A','C','D']" in js
    assert "patch('scene.visual_settings.custom_furniture_plan'" in js
    assert "patch('room.configuration'" in js


def test_wall_by_wall_communications_supports_empty_wall_and_left_to_right_progression():
    html = (ROOT / 'app/static/room-elements.html').read_text(encoding='utf-8')
    js = (ROOT / 'app/static/room-elements-v2.js').read_text(encoding='utf-8')
    assert 'id="wallProgress"' in html
    assert 'id="emptyWallButton"' in html
    assert 'id="confirmWallButton"' in html
    assert 'Пустая стена' in html
    assert "wallStatuses[wall]=mark" in js
    assert "communication_walls" in js
    assert 'moveNext' in js


def test_communication_dropdown_and_wall_features_use_existing_owner_list():
    html = (ROOT / 'app/static/room-elements.html').read_text(encoding='utf-8')
    for label in [
        'Канализация', 'Вода', 'Питание варочной / духовки', 'Вентканал / вытяжка',
        'Питание холодильника', 'Розетки / выводы', 'Окно', 'Дверь', 'Радиатор',
        'Подшторник / карниз', 'Ниша', 'Колонна', 'Выступ', 'Балка', 'Другое'
    ]:
        assert label in html
    assert 'id="elementSelect"' in html


def test_selected_wall_element_has_xz_controls_and_position_dimension_toggle():
    html = (ROOT / 'app/static/room-elements.html').read_text(encoding='utf-8')
    js = (ROOT / 'app/static/room-elements-v2.js').read_text(encoding='utf-8')
    assert 'id="coordinateX"' in html
    assert 'id="coordinateZ"' in html
    assert 'data-nudge-axis="x" data-nudge="-10"' in html
    assert 'data-nudge-axis="x" data-nudge="10"' in html
    assert 'data-nudge-axis="z" data-nudge="-10"' in html
    assert 'data-nudge-axis="z" data-nudge="10"' in html
    assert 'id="positionDimensionsToggle"' in html
    assert 'show_communication_dimensions' in js
    assert 'X — от левого края стены, Z — от пола' in html


def test_wall_placements_persist_to_project_state_without_replacing_unmanaged_data():
    js = (ROOT / 'app/static/room-elements-v2.js').read_text(encoding='utf-8')
    assert "patch('communications'" in js
    assert "patch('room.architectural_elements'" in js
    assert "BIZET_WALL:" in js
    assert "source:'BIZET_WALL_FEATURE'" in js
    assert 'retained=' in js


def test_room_elements_route_serves_new_runtime():
    response = client.get('/room-elements')
    assert response.status_code == 200
    assert '/static/room-elements-v2.js' in response.text
    assert 'Конфигурация мебели и коммуникации' in response.text
