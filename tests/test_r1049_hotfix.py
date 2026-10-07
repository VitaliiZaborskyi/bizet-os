from pathlib import Path
import shutil
import subprocess
import pytest

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "app" / "static"


def read(name: str) -> str:
    return (STATIC / name).read_text(encoding="utf-8")


def test_r1049_hotfix_kitchen_uses_shared_webgl_viewer():
    html = read("workspace-r8.html")
    js = read("kitchen-webgl-r1049.js")
    assert "three@0.128.0/build/three.min.js" in html
    assert "OrbitControls.js" in html
    assert "/static/kitchen-webgl-r1049.js?v=1049h2" in html
    assert "new THREE.WebGLRenderer" in js
    assert "new THREE.OrbitControls" in js
    assert "scene.background = new THREE.Color(0x24262a)" in js
    assert "window.BizetPilot3D.drawKitchenScene = function" in js
    assert "btn?.click()" in js


def test_r1049_hotfix_ukrainian_visible_workspace_strings():
    html = read("workspace-r8.html")
    js = read("ua-ui-r1049.js")
    assert "/static/ua-ui-r1049.js?v=1049h2" in html
    for token in [
        "'Итоговая стоимость':'Підсумкова вартість'",
        "'Скачать предложение':'Завантажити пропозицію'",
        "'Купить':'Купити'",
        "'Настройки проекта':'Налаштування проєкту'",
        "'Список модулей':'Список модулів'",
    ]:
        assert token in js


def test_r1049_hotfix_grande_does_not_trigger_ios_input_zoom_and_rule_is_localized():
    css = read("grande-r1048.css")
    js = read("grande-r1048.js")
    html = read("grande-r1046.html")
    assert "-webkit-text-size-adjust:100%" in css
    assert ".panel .field input,.panel .field select{font-size:16px;min-height:48px}" in css
    assert "Жорстке правило: верх блоку звичайних шухляд не вище 1200 мм від підлоги." in js
    assert "Hard rule: верх блоку" not in js
    assert "/static/grande-r1048.css?v=1049h2" in html
    assert "/static/grande-r1048.js?v=1049h2" in html


def test_r1049_hotfix_javascript_syntax_when_node_is_available():
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not available")
    for name in ["kitchen-webgl-r1049.js", "ua-ui-r1049.js", "grande-r1048.js"]:
        path = STATIC / name
        result = subprocess.run([node, "--check", str(path)], capture_output=True, text=True)
        assert result.returncode == 0, f"{name}: {result.stderr}"
