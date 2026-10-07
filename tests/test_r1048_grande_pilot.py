from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_r1048_grande_uses_webgl_threejs_pipeline():
    html = read("app/static/grande-r1046.html")
    js = read("app/static/grande-r1048.js")
    assert "three@0.128.0/build/three.min.js" in html
    assert "OrbitControls.js" in html
    assert "new THREE.WebGLRenderer" in js
    assert "controls.rotateSpeed=-.62" in js
    assert "transparent:false" in js


def test_r1048_grande_has_view_edit_and_seven_engineering_sections():
    html = read("app/static/grande-r1046.html")
    for panel in ("room", "size", "drawers", "shelves", "equipment", "lighting", "production"):
        assert f'data-panel="{panel}"' in html
    assert 'id="viewMode"' in html
    assert 'id="editMode"' in html
    assert 'id="priceHud"' in html
    assert 'id="addProduct"' in html


def test_r1048_wardrobe_controls_include_drawer_bodies_handles_rod_led_and_drilling():
    js = read("app/static/grande-r1048.js")
    for contract in (
        "lowerZoneEnabled",
        "drawerBody",
        "handleMode",
        "rodEnabled",
        "Rail support left",
        "ledEnabled",
        "drillOps",
        "rigidNote",
        "xray",
    ):
        assert contract in js


def test_r1048_production_panel_has_xml_bom_detailing_and_order():
    js = read("app/static/grande-r1048.js")
    assert "Project3dc" in js
    assert "Grande_BIZET_PILOT.project" in js
    assert "BIZET_Grande_BOM.csv" in js
    assert "BIZET_Grande_Detailing.csv" in js
    assert "showOrder()" in js


def test_r1048_start_wardrobes_route_is_live():
    js = read("app/static/start.js")
    css = read("app/static/next-pilot.css")
    assert "value === 'ZONE_WARDROBE'" in js
    assert "window.location.href='/wardrobes?manufacturer=treeart'" in js
    assert "wardrobe-active" in js
    assert ".choice-card.wardrobe-active" in css
