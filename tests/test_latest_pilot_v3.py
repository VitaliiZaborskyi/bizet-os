from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_start_flow_adds_kitchen_configuration_as_screen_five():
    js = (ROOT / 'app/static/start-room-handoff.js').read_text(encoding='utf-8')
    css = (ROOT / 'app/static/room-elements-latest.css').read_text(encoding='utf-8')
    assert 'Шаг 5 из 5' in js
    assert 'Выберите конфигурацию кухни' in js
    assert 'config-mini-plan' in js
    assert '.config-mini-plan' in css
    for code in ['WALL_CENTER', 'WALL_LEFT', 'WALL_RIGHT', 'L_LEFT', 'L_RIGHT', 'U_SHAPE', 'CUSTOM']:
        assert code in js
    assert "patchProject('room.configuration'" in js
    assert "patchProject('scene.visual_settings.configuration_walls'" in js
    assert "window.location.assign('/room')" in js


def test_pilot_zone_screen_keeps_only_kitchen_active():
    js = (ROOT / 'app/static/start-room-handoff.js').read_text(encoding='utf-8')
    assert 'lockPilotToKitchen' in js
    assert 'pilot-disabled-choice' in js
    assert "text.includes('кухня')" in js
    assert 'button.disabled = true' in js


def test_mobile_room_orbit_disables_page_scroll_on_canvas():
    css = (ROOT / 'app/static/room-latest.css').read_text(encoding='utf-8')
    assert '#roomCanvas' in css
    assert 'touch-action: none !important' in css
    assert 'overscroll-behavior: none !important' in css
    assert '#viewCubeShell { display: none !important; }' in css


def test_glb_is_converted_to_bizet_wall_contour_not_only_bounds():
    js = (ROOT / 'app/static/room-latest.js').read_text(encoding='utf-8')
    assert 'parseGlb' in js
    assert 'createAccessorReader' in js
    assert 'collectMeshInstances' in js
    assert 'horizontalTriangleIntersection' in js
    assert 'mergeWallGroups' in js
    assert 'MULTI_SLICE_VERTICAL_PLANES' in js
    assert 'contour_segments_m' in js
    assert 'reference_segments_m' in js
    assert 'slice_heights_m' in js
    assert "status: 'CONTOUR_CANDIDATE'" in js


def test_scan_flow_is_one_question_then_separate_contour_confirmation():
    js = (ROOT / 'app/static/room-latest.js').read_text(encoding='utf-8')
    assert 'Как получим геометрию помещения?' in js
    assert 'Загрузить скан' in js
    assert 'Ввести вручную' in js
    assert 'Контур помещения определён верно?' in js
    assert 'Да, верно' in js
    assert 'Исправить вручную' in js
    assert "window.location.assign('/room?scan=confirm')" in js


def test_portrait_ceiling_popup_moves_right_by_one_third_with_safe_correction():
    css = (ROOT / 'app/static/room-latest.css').read_text(encoding='utf-8')
    js = (ROOT / 'app/static/room-latest.js').read_text(encoding='utf-8')
    assert '@media (max-width: 700px) and (orientation: portrait)' in css
    assert 'translateX(calc(33%' in css
    assert '--ceiling-extra-shift' in css
    assert 'clampCeilingPopup' in js
    assert 'window.innerWidth - safe' in js


def test_original_top_view_configuration_drawings_are_available_for_screen_five():
    css = (ROOT / 'app/static/room-elements-latest.css').read_text(encoding='utf-8')
    assert '.config-mini-plan.center .line-a' in css
    assert '.config-mini-plan.l-left .line-b' in css
    assert '.config-mini-plan.l-right .line-b' in css
    assert '.config-mini-plan.u .line-c' in css
    assert '.config-mini-plan.custom::after' in css


def test_visual_quest_buttons_keep_physical_press_feedback():
    css = (ROOT / 'app/static/room-elements-latest.css').read_text(encoding='utf-8')
    assert '.visual-config-card:active' in css
    assert 'translateY(5px) scale(.985)' in css
    assert 'box-shadow:' in css
    assert '.elements-experience .primary-button:active' in css


def test_wall_service_symbols_remain_available_after_flow_change():
    js = (ROOT / 'app/static/room-elements-latest.js').read_text(encoding='utf-8')
    assert "return'sewer-water'" in js
    assert "return'socket'" in js
    assert "return'wire'" in js
    assert "item.kind==='sewer-water'" in js
    assert 'bezierCurveTo' in js
    assert 'roundRect' in js
