from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_start_flow_adds_kitchen_configuration_as_standalone_screen_five():
    js = (ROOT / 'app/static/start-room-handoff.js').read_text(encoding='utf-8')
    css = (ROOT / 'app/static/room-elements-latest.css').read_text(encoding='utf-8')
    assert 'Шаг 5 из 5' in js
    assert 'Выберите конфигурацию кухни' in js
    assert 'configurationScreenFive' in js
    assert 'summaryCard.hidden = true' in js
    assert 'config-mini-plan' in js
    assert '.config-mini-plan' in css
    for code in ['WALL_CENTER', 'WALL_LEFT', 'WALL_RIGHT', 'L_LEFT', 'L_RIGHT', 'U_SHAPE', 'CUSTOM']:
        assert code in js
    assert "patchProject('room.configuration'" in js
    assert "patchProject('scene.visual_settings.configuration_walls'" in js
    assert '/room?project=' in js


def test_pilot_zone_screen_keeps_only_kitchen_active():
    js = (ROOT / 'app/static/start-room-handoff.js').read_text(encoding='utf-8')
    assert 'lockPilotToKitchen' in js
    assert 'pilot-disabled-choice' in js
    assert "text.includes('кухня')" in js
    assert 'button.disabled = true' in js


def test_project_id_is_persisted_across_room_and_communications_pages():
    bridge = (ROOT / 'app/static/project-session-bridge.js').read_text(encoding='utf-8')
    room = (ROOT / 'app/static/room.html').read_text(encoding='utf-8')
    elements = (ROOT / 'app/static/room-elements.html').read_text(encoding='utf-8')
    handoff = (ROOT / 'app/static/start-room-handoff.js').read_text(encoding='utf-8')
    assert "params.get('project')" in bridge
    assert 'localStorage.getItem(KEY)' in bridge
    assert 'sessionStorage.setItem(KEY, projectId)' in bridge
    assert '/static/project-session-bridge.js' in room
    assert '/static/project-session-bridge.js' in elements
    assert 'localStorage.setItem(STORAGE_KEY, id)' in handoff


def test_mobile_room_orbit_disables_page_scroll_on_canvas():
    css = (ROOT / 'app/static/room-latest.css').read_text(encoding='utf-8')
    assert '#roomCanvas' in css
    assert 'touch-action: none !important' in css
    assert 'overscroll-behavior: none !important' in css
    assert '#viewCubeShell { display: none !important; }' in css


def test_scan_code_is_preserved_but_scan_is_inactive_for_manual_qa():
    scan_js = (ROOT / 'app/static/room-latest.js').read_text(encoding='utf-8')
    manual_js = (ROOT / 'app/static/manual-pilot.js').read_text(encoding='utf-8')
    manual_css = (ROOT / 'app/static/manual-pilot.css').read_text(encoding='utf-8')
    assert 'parseGlb' in scan_js
    assert 'MULTI_SLICE_VERTICAL_PLANES' in scan_js
    assert "toolbar.disabled = true" in manual_js
    assert "scan.textContent = pilotRu() ? 'Скан · позже'" in manual_js
    assert '#scanContourCanvas' in manual_css
    assert 'display: none !important' in manual_css


def test_manual_geometry_is_one_question_per_step_and_persists_confirmed_values():
    js = (ROOT / 'app/static/manual-pilot.js').read_text(encoding='utf-8')
    assert 'Какова длина основной стены?' in js
    assert 'Какова глубина помещения?' in js
    assert 'Какова высота помещения?' in js
    assert "path: 'room.geometry.wall_length'" in js
    assert "path: 'room.geometry.wall_depth'" in js
    assert "path: 'room.geometry.room_height'" in js
    assert "source: 'USER', confirmed: true" in js
    assert "geometry_input_mode', 'MANUAL'" in js
    assert "manual_geometry_complete', true" in js


def test_manual_flow_routes_to_communications_with_same_project_id():
    js = (ROOT / 'app/static/manual-pilot.js').read_text(encoding='utf-8')
    assert 'routeToCommunications' in js
    assert 'project?.room?.ceiling?.type' in js
    assert '/room-elements?step=communications&project=' in js


def test_glb_is_converted_to_bizet_wall_contour_not_only_bounds_for_future_reactivation():
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
