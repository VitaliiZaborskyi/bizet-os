from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_final_start_choice_scrolls_to_confirmation_button():
    js = (ROOT / 'app/static/start-room-handoff.js').read_text(encoding='utf-8')
    assert 'MutationObserver' in js
    assert 'summaryCard' in js
    assert "scrollIntoView({ behavior: 'smooth', block: 'center'" in js


def test_room_geometry_screen_is_kept_simple_and_ceiling_gates_continue():
    js = (ROOT / 'app/static/room-latest.js').read_text(encoding='utf-8')
    css = (ROOT / 'app/static/room-latest.css').read_text(encoding='utf-8')
    assert 'buildCeilingGate' in js
    assert 'selectedCeiling' in js
    assert 'Чтобы продолжить, выберите тип потолка.' in js
    assert "window.location.assign(CONFIG_ROUTE)" in js
    assert '.quest-summary { display: none !important; }' in css
    assert 'touch-action: none !important' in css


def test_scan_import_extracts_actual_geometry_preview_and_returns_to_room():
    js = (ROOT / 'app/static/room-latest.js').read_text(encoding='utf-8')
    assert 'extractGeometryPreview' in js
    assert 'readAccessor' in js
    assert 'geometry_preview' in js
    assert 'segments_m' in js
    assert 'scanOverlayCanvas' in js
    assert "window.location.assign('/room?scan=applied')" in js
    assert 'multiple hidden' in js


def test_configuration_quest_matches_reference_with_large_tactile_cards():
    js = (ROOT / 'app/static/room-elements-latest.js').read_text(encoding='utf-8')
    css = (ROOT / 'app/static/room-elements-latest.css').read_text(encoding='utf-8')
    assert 'config-reference-stage' in js
    assert 'ref-furniture' in js
    assert 'configurationContinue' in js
    assert '#f5c94a' in css
    assert '.visual-config-card:active' in css
    assert 'translateY(6px) scale(.985)' in css
    assert '.configuration-preview-wrap { display:none !important; }' in css


def test_configuration_and_communications_are_sequential_steps():
    js = (ROOT / 'app/static/room-elements-latest.js').read_text(encoding='utf-8')
    assert 'keepConfigurationOnly' in js
    assert 'showCommunicationsMode' in js
    assert "step')==='communications'" in js
    assert "window.location.assign('/room-elements?step=communications')" in js


def test_communications_are_separate_drag_enabled_and_have_defaults():
    js = (ROOT / 'app/static/room-elements-latest.js').read_text(encoding='utf-8')
    css = (ROOT / 'app/static/room-elements-latest.css').read_text(encoding='utf-8')
    assert "return'sewer'" in js
    assert "return'water'" in js
    assert 'linkWaterToSewer' in js
    assert 'seedDefaultCommunications' in js
    for value in ['600', '1100', '1500', '1800', '700']:
        assert value in js
    assert 'pointermove' in js
    assert 'direct-drag-enabled' in css
