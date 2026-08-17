from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_visualizer_is_separate_from_rule_engine():
    js = (ROOT / 'app/static/visualizer.js').read_text(encoding='utf-8')
    app = (ROOT / 'app/static/app.js').read_text(encoding='utf-8')
    assert 'export function drawSkeleton' in js
    assert "import { drawSkeleton } from './visualizer.js'" in app
    # Pilot vertical display dimensions are explicitly marked visualization-only.
    assert 'Visualization-only display envelopes' in js


def test_three_live_views_are_present():
    html = (ROOT / 'app/static/index.html').read_text(encoding='utf-8')
    assert 'data-view="PERSPECTIVE"' in html
    assert 'data-view="FRONT"' in html
    assert 'data-view="PLAN"' in html
    assert 'обновляется автоматически' in html


def test_input_events_trigger_live_regeneration():
    app = (ROOT / 'app/static/app.js').read_text(encoding='utf-8')
    assert "addEventListener('input',scheduleGenerate)" in app
    assert 'setTimeout(generate,220)' in app
