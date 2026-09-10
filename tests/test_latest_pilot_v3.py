from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def test_start_flow_keeps_configuration_as_standalone_screen():
    js = read('app/static/start-room-handoff.js')
    assert 'configurationScreenFive' in js
    assert 'summaryCard.hidden = true' in js
    assert "experience.classList.add('screen-five-active')" in js
    assert "document.body.classList.add('config-screen-five-open')" in js
    for code in ['WALL_CENTER', 'WALL_LEFT', 'WALL_RIGHT', 'L_LEFT', 'L_RIGHT', 'U_SHAPE', 'CUSTOM']:
        assert code in js
    assert "patchProject('room.configuration'" in js
    assert "patchProject('scene.visual_settings.configuration_walls'" in js
    assert '/room?project=' in js


def test_all_start_questions_use_action_cta_and_step_counter_is_hidden():
    js = read('app/static/next-pilot-start.js')
    css = read('app/static/next-pilot.css')
    index = read('app/static/index.html')
    for text in [
        'Выберите тип объекта',
        'Выберите тип изделия',
        'Выберите уровень комплектации',
        'Выберите оформление',
        'Выберите конфигурацию кухни',
    ]:
        assert text in js
    assert '.step-meta' in css and '.progress' in css
    assert 'display:none !important' in css
    assert 'id="stepMeta" hidden' in index
    assert 'id="progress" aria-label="Прогресс" hidden' in index


def test_laptop_start_and_configuration_are_compacted_without_losing_tactile_cards():
    css = read('app/static/next-pilot.css')
    assert '.topbar { height:58px' in css
    assert 'min-height:clamp(250px,42vh,360px)' in css
    assert '.choice-card:active' in css
    assert 'grid-template-columns:repeat(4,minmax(0,1fr))' in css
    assert '.configuration-choice-card:active' in css
    assert '@media (max-height:820px)' in css


def test_screen_five_uses_owner_reference_top_view_plans_not_pseudo_3d():
    js = read('app/static/start-room-handoff.js')
    assert 'config-reference-plan' in js
    assert 'config-run back' in js
    assert 'config-run left-side' in js
    assert 'config-run right-side' in js
    assert '.config-reference-plan.l-left .config-run.back' in js
    assert '.config-reference-plan.l-right .config-run.back' in js
    assert '.config-reference-plan.u .config-run.back' in js
    assert 'Owner reference: clear top-view room outline + broad kitchen runs' in js


def test_screen_five_keeps_header_back_and_settings_interactive():
    handoff = read('app/static/start-room-handoff.js')
    start = read('app/static/start.js')
    assert 'body.config-screen-five-open .topbar' in handoff
    assert 'pointer-events:auto !important' in handoff
    assert "document.getElementById('backButton')?.addEventListener('click'" in handoff
    assert "$('settingsButton').addEventListener('click'" in start
    assert "$('backButton').addEventListener('click'" in start


def test_pilot_zone_screen_keeps_only_kitchen_active():
    js = read('app/static/start-room-handoff.js')
    assert 'lockPilotToKitchen' in js
    assert 'pilot-disabled-choice' in js
    assert "text.includes('кухня')" in js
    assert 'button.disabled = true' in js


def test_custom_configuration_is_a_separate_draw_confirm_screen():
    main = read('app/main.py')
    html = read('app/static/custom-configuration.html')
    js = read('app/static/custom-configuration.js')
    css = read('app/static/custom-configuration.css')
    start_override = read('app/static/next-pilot-start.js')
    assert '@app.get("/custom-configuration"' in main
    assert 'Нарисуйте конфигурацию кухни' in html
    assert 'Подтвердите конфигурацию' in html
    assert 'customDrawCanvas' in html and 'customPreviewCanvas' in html
    assert "pointerdown" in js and "pointermove" in js and "pointerup" in js
    assert "USER_DRAWN_UNCLASSIFIED" in js
    assert "recognition: 'DEFERRED_PLACEHOLDER'" in js
    assert "patch('room.configuration', 'CUSTOM'" in js
    assert "custom-configuration" in start_override
    assert 'touch-action:none' in css


def test_project_id_is_persisted_across_custom_room_and_communications_pages():
    bridge = read('app/static/project-session-bridge.js')
    room = read('app/static/room.html')
    elements = read('app/static/room-elements.html')
    custom = read('app/static/custom-configuration.html')
    assert "params.get('project')" in bridge
    assert 'localStorage.getItem(KEY)' in bridge
    assert 'sessionStorage.setItem(KEY, projectId)' in bridge
    assert '/static/project-session-bridge.js' in room
    assert '/static/project-session-bridge.js' in elements
    assert '/static/project-session-bridge.js' in custom


def test_scan_code_is_preserved_but_scan_is_disabled_for_current_manual_pilot():
    scan_js = read('app/static/room-latest.js')
    manual_js = read('app/static/manual-pilot.js')
    manual_css = read('app/static/manual-pilot.css')
    assert 'parseGlb' in scan_js
    assert 'MULTI_SLICE_VERTICAL_PLANES' in scan_js
    assert 'toolbar.disabled = true' in manual_js
    assert "'Скан · позже'" in manual_js
    assert "document.getElementById('geometryInputQuestion')?.remove()" in manual_js
    assert '#scanContourCanvas' in manual_css
    assert 'display: none !important' in manual_css


def test_manual_geometry_is_its_own_screen_and_persists_valid_provenance():
    js = read('app/static/manual-pilot.js')
    css = read('app/static/next-pilot.css')
    assert 'Укажите размеры помещения' in js
    assert 'Длина основной стены' in js
    assert 'Глубина помещения' in js
    assert 'Высота помещения' in js
    assert "path: 'room.geometry.wall_length'" in js
    assert "path: 'room.geometry.wall_depth'" in js
    assert "path: 'room.geometry.room_height'" in js
    assert "source: 'USER_CONFIRMED', confirmed: true" in js
    assert "document.body.classList.add('manual-room-active')" in js
    assert 'body.manual-room-active .room-heading' in css
    assert "geometry_input_mode', 'MANUAL'" in js
    assert "manual_geometry_complete', true" in js


def test_manual_error_handling_never_stringifies_validation_object():
    js = read('app/static/manual-pilot.js')
    assert 'safeErrorDetail' in js
    assert "typeof detail === 'string'" in js
    assert 'Array.isArray(detail)' in js
    assert "typeof first?.msg === 'string'" in js
    assert "payload.detail || detail" not in js
    assert "source: 'USER'" not in js


def test_manual_flow_routes_directly_to_separate_communications_screen():
    js = read('app/static/manual-pilot.js')
    elements = read('app/static/room-elements.html')
    overlay = read('app/static/next-pilot-elements.js')
    assert '/room-elements?step=communications&project=' in js
    assert 'Укажите коммуникации' in elements
    assert 'body class="communications-only"' in elements
    assert '/static/next-pilot-elements.js' in elements
    assert "document.body.classList.add('communications-only')" in overlay
    assert "document.querySelector('.configuration-card')?.setAttribute('hidden', '')" in overlay


def test_standard_configuration_wall_sequences_survive_communications_separation():
    core = read('app/static/room-elements-v2.js')
    overlay = read('app/static/next-pilot-elements.js')
    for sequence in ["L_LEFT: ['B','A']", "L_RIGHT: ['A','C']", "U_SHAPE: ['B','A','C']"]:
        assert sequence in core
    assert "L_LEFT: ['B', 'A']" in overlay
    assert "L_RIGHT: ['A', 'C']" in overlay
    assert "U_SHAPE: ['B', 'A', 'C']" in overlay
    assert "select.dispatchEvent(new Event('change', { bubbles: true }))" in overlay


def test_custom_communications_has_safe_placeholder_until_wall_recognition_exists():
    overlay = read('app/static/next-pilot-elements.js')
    css = read('app/static/next-pilot.css')
    assert 'customCommunicationsPlaceholder' in overlay
    assert "configuration === 'CUSTOM' && !walls.length" in overlay
    assert 'Кастомная траектория сохранена и подтверждена' in overlay
    assert '.custom-communications-placeholder' in css


def test_mobile_room_orbit_code_and_ceiling_portrait_fix_remain_preserved():
    css = read('app/static/room-latest.css')
    js = read('app/static/room-latest.js')
    assert '#roomCanvas' in css
    assert 'touch-action: none !important' in css
    assert 'overscroll-behavior: none !important' in css
    assert '@media (max-width: 700px) and (orientation: portrait)' in css
    assert 'translateX(calc(33%' in css
    assert '--ceiling-extra-shift' in css
    assert 'clampCeilingPopup' in js


def test_glb_future_code_is_preserved_but_not_part_of_current_route():
    js = read('app/static/room-latest.js')
    assert 'parseGlb' in js
    assert 'createAccessorReader' in js
    assert 'collectMeshInstances' in js
    assert 'horizontalTriangleIntersection' in js
    assert 'mergeWallGroups' in js
    assert 'MULTI_SLICE_VERTICAL_PLANES' in js
    assert 'contour_segments_m' in js
    assert "status: 'CONTOUR_CANDIDATE'" in js


def test_existing_wall_service_symbols_remain_available_after_ux_flow_change():
    js = read('app/static/room-elements-latest.js')
    assert "return'sewer-water'" in js
    assert "return'socket'" in js
    assert "return'wire'" in js
    assert "item.kind==='sewer-water'" in js
    assert 'bezierCurveTo' in js
    assert 'roundRect' in js
