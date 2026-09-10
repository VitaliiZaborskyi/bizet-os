from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

ROOT = Path(__file__).resolve().parents[1]
client = TestClient(app)


def test_start_page_has_immediate_cta_before_api_bootstrap():
    response = client.get('/')
    assert response.status_code == 200
    assert '<h1 id="stepTitle">Выберите тип объекта</h1>' in response.text
    assert '/static/start-fast-paint.js' in response.text


def test_fast_paint_renders_four_local_fallback_cards_without_remote_dependency():
    js = (ROOT / 'app/static/start-fast-paint.js').read_text(encoding='utf-8')
    for label in ['Новострой', 'Старый фонд', 'Частный дом', 'Коммерческое помещение']:
        assert label in js
    assert '--card-image:none' in js
    assert 'pointer-events:none' in js
    assert 'MutationObserver' in js


def test_start_override_observers_are_bounded_and_cannot_watch_their_own_title_mutations():
    js = (ROOT / 'app/static/next-pilot-start.js').read_text(encoding='utf-8')
    assert 'observe(document.documentElement' not in js
    assert "attributeFilter: ['data-kind']" in js
    assert 'experienceObserver.observe(experience, { childList: true });' in js
    assert 'setTextIfChanged' in js
    assert "attributeFilter: ['data-kind','hidden']" not in js


def test_root_head_is_fast_200_for_render_wake_probe():
    response = client.head('/')
    assert response.status_code == 200
    assert response.headers.get('cache-control') == 'no-cache'


def test_static_assets_are_reusable_and_html_stays_fresh():
    html = client.get('/')
    asset = client.get('/static/next-pilot.css')
    assert html.headers.get('cache-control') == 'no-cache'
    assert 'max-age=300' in asset.headers.get('cache-control', '')
    assert 'stale-while-revalidate=86400' in asset.headers.get('cache-control', '')


def test_gzip_middleware_is_enabled_for_payload_reduction():
    main = (ROOT / 'app/main.py').read_text(encoding='utf-8')
    assert 'GZipMiddleware' in main
    assert 'minimum_size=500' in main
