from pathlib import Path
import shutil
import subprocess
import pytest

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "app" / "static"


def read(name: str) -> str:
    return (STATIC / name).read_text(encoding="utf-8")


def test_r1050_kitchen_uses_current_shared_webgl_viewer_without_default_fog():
    html = read("workspace-r8.html")
    js = read("kitchen-webgl-r1050.js")
    assert "three@0.128.0/build/three.min.js" in html
    assert "OrbitControls.js" in html
    assert "/static/kitchen-webgl-r1050.js?v=1050" in html
    assert "new THREE.WebGLRenderer" in js
    assert "new THREE.OrbitControls" in js
    assert "scene.background=new THREE.Color(0xefede7)" in js
    assert "scene.fog=null" in js
    assert "window.BizetPilot3D.drawKitchenScene=" in js


def test_r1050_ukrainian_visible_workspace_strings():
    html = read("workspace-r8.html")
    js = read("ua-ui-r1050.js")
    assert "/static/ua-ui-r1050.js?v=1050" in html
    for token in [
        "'Итоговая стоимость':'Підсумкова вартість'",
        "'Скачать предложение':'Завантажити пропозицію'",
        "'Купить':'Купити'",
        "'Настройки проекта':'Налаштування проєкту'",
        "'Список модулей':'Список модулів'",
        "'Производственный подрядчик':'Виробничий підрядник'",
    ]:
        assert token in js


def test_r1050_grande_does_not_trigger_ios_input_zoom_and_rule_is_localized():
    css = read("grande-r1048.css")
    js = read("grande-r1048.js")
    html = read("grande-r1046.html")
    assert "-webkit-text-size-adjust:100%" in css
    assert ".panel .field input,.panel .field select{font-size:16px;min-height:48px}" in css
    assert "Жорстке правило: верх блоку звичайних шухляд не вище 1200 мм від підлоги." in js
    assert "Hard rule: верх блоку" not in js
    assert "/static/grande-r1048.css?v=1050" in html
    assert "/static/grande-r1048.js?v=1050" in html


def test_r1050_javascript_syntax_when_node_is_available():
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not available")
    for name in [
        "kitchen-webgl-r1050.js",
        "ua-ui-r1050.js",
        "workspace-r1050.js",
        "production-r1050.js",
        "grande-r1048.js",
        "grande-r1050.js",
        "pilot-shell.js",
    ]:
        path = STATIC / name
        result = subprocess.run([node, "--check", str(path)], capture_output=True, text=True)
        assert result.returncode == 0, f"{name}: {result.stderr}"
