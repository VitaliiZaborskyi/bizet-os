from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_final_start_choice_scrolls_to_confirmation_button():
    js = (ROOT / 'app/static/start-room-handoff.js').read_text(encoding='utf-8')
    assert 'MutationObserver' in js
    assert 'summaryCard' in js
    assert "scrollIntoView({ behavior: 'smooth', block: 'center'" in js


def test_mobile_room_orbit_disables_page_scroll_on_canvas():
    css = (ROOT / 'app/static/room-latest.css').read_text(encoding='utf-8')
    assert '#roomCanvas' in css
    assert 'touch-action: none !important' in css
    assert 'overscroll-behavior: none !important' in css
    assert '#viewCubeShell { display: none !important; }' in css


def test_configuration_quest_uses_3d_room_and_cabinet_blocks_not_flat_lines():
    js = (ROOT / 'app/static/room-elements-latest.js').read_text(encoding='utf-8')
    css = (ROOT / 'app/static/room-elements-latest.css').read_text(encoding='utf-8')
    assert 'config-3d-stage' in js
    assert 'cabinet-unit' in js
    assert 'config-back-wall' in js
    assert 'config-side-wall' in js
    assert 'perspective: 520px' in css
    assert '.configuration-preview-wrap { display: none !important; }' in css
    assert 'config-line' not in js


def test_configuration_visuals_follow_previously_selected_zone():
    js = (ROOT / 'app/static/room-elements-latest.js').read_text(encoding='utf-8')
    assert 'context?.zone_type' in js
    assert 'context?.product_type' in js
    assert 'zone-kitchen' in (ROOT / 'app/static/room-elements-latest.css').read_text(encoding='utf-8') or 'zoneClass()' in js
    assert 'zoneLabel()' in js


def test_visual_quest_buttons_have_physical_press_feedback():
    css = (ROOT / 'app/static/room-elements-latest.css').read_text(encoding='utf-8')
    assert '.visual-config-card:active' in css
    assert 'translateY(5px) scale(.985)' in css
    assert 'box-shadow:' in css
    assert '.elements-experience .primary-button:active' in css


def test_wall_service_symbols_include_sewer_water_socket_and_wire_language():
    js = (ROOT / 'app/static/room-elements-latest.js').read_text(encoding='utf-8')
    assert "return'sewer-water'" in js
    assert "return'socket'" in js
    assert "return'wire'" in js
    assert "item.kind==='sewer-water'" in js
    assert 'bezierCurveTo' in js
    assert 'roundRect' in js
