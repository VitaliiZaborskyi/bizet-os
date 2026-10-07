from pathlib import Path
import shutil
import subprocess
import pytest

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "app" / "static"


def read(name: str) -> str:
    return (STATIC / name).read_text(encoding="utf-8")


def test_r1050_app_and_current_assets_are_wired():
    main = (ROOT / "app" / "main.py").read_text(encoding="utf-8")
    workspace = read("workspace-r8.html")
    grande = read("grande-r1046.html")
    assert 'version="R10.5.1"' in main
    for asset in [
        "/static/r1050.css?v=1051",
        "/static/production-r1050.js?v=1051",
        "/static/kitchen-webgl-r1050.js?v=1051",
        "/static/workspace-r1050.js?v=1051",
        "/static/ua-ui-r1050.js?v=1051",
    ]:
        assert asset in workspace
    for asset in [
        "/static/production-r1050.js?v=1051",
        "/static/grande-r1050.css?v=1051",
        "/static/grande-r1050.js?v=1051",
        "/static/ua-ui-r1050.js?v=1051",
    ]:
        assert asset in grande


def test_r1050_canonical_part_model_has_finished_cut_edges_and_machining():
    production = read("production-r1050.js")
    for token in [
        "SOURCE={",
        "IMPORT:'IMPORT'",
        "GENERATED:'BIZET GENERATED'",
        "const EDGE_MM=.8",
        "part.finished={length,width}",
        "part.cut={length:",
        "part.edges=normalizeEdges",
        "drillings:Array.isArray",
        "operations:Array.isArray",
        "connectionId",
        "UNRESOLVED",
    ]:
        assert token in production
    assert "n(length)-n(edges.L)-n(edges.R)" in production
    assert "n(width)-n(edges.T)-n(edges.B)" in production


def test_r1050_quadro_project3dc_export_carries_bands_drillings_and_parent_graph():
    production = read("production-r1050.js")
    assert "QUADRO:{id:'QUADRO',name:'Quadro',active:true" in production
    assert "VIYAR:{id:'VIYAR',name:'Viyar',active:false" in production
    assert "KRONAS:{id:'KRONAS',name:'Kronas',active:false" in production
    for token in [
        "<Project3dc name=",
        'version="3.0"',
        "type:'band'",
        "band'+side+'=",
        "<Bands>",
        "<Band id=",
        "<Drilling X=",
        'class="51"',
        'class="1"',
        'parent="',
        "ShapeOverallCS",
        "ShapeCuttingCS",
    ]:
        assert token in production


def test_r1050_confirmat_is_profile_template_with_face_and_edge_drillings():
    production = read("production-r1050.js")
    block = production[production.index("CONFIRMAT_6_3X50"):production.index("DOWEL_8X30")]
    assert "code:'019556'" in block
    assert "name:'Confirmat 6.3x50'" in block
    assert "diameter:6.3" in block
    assert "face:{diameter:7,depth:18,type:'FACE'}" in block
    assert "edge:{diameter:5,depth:52,type:'EDGE'}" in block


def test_r1050_import_does_not_claim_raw_grande_dwg_parse():
    production = read("production-r1050.js")
    assert "source:SOURCE.IMPORT" in production
    assert "source_status:'PARAMETRIC_PILOT_NO_DWG_PARSE'" in production
    assert "UNRESOLVED" in production


def test_r1050_standard_kitchen_is_clean_and_deep_shadow_is_optional():
    viewer = read("kitchen-webgl-r1050.js")
    workspace = read("workspace-r1050.js")
    assert "scene.fog=null" in viewer
    assert "scene.background=new THREE.Color(0xefede7)" in viewer
    assert "deepShadow=localStorage.getItem('bizet_deep_shadow')==='1'" in viewer
    assert "function setDeepShadow(on)" in viewer
    assert "setDeepShadow" in workspace
    assert "deepShadowButton" in workspace


def test_r1050_view_mode_is_fullscreen_and_motion_is_opt_in():
    css = read("r1050.css")
    js = read("workspace-r1050.js")
    viewer = read("kitchen-webgl-r1050.js")
    assert ".r1050-view-full #modelStage" in css
    assert "width:100vw!important" in css
    assert "height:100dvh!important" in css
    assert "document.body.classList.toggle('r1050-view-full',isView)" in js
    assert "motionButton" in js
    assert "double" not in viewer.lower() or "lastTap" in viewer
    assert "lastTap.id===id&&now-lastTap.time<420" in viewer
    assert "m.type==='door'" in viewer
    assert "m.type==='drawer'" in viewer


def test_r1050_kitchen_dimensions_are_large_and_focus_is_transparent():
    viewer = read("kitchen-webgl-r1050.js")
    assert "function textSprite(text,scale=2.4)" in viewer
    assert "focus?2.8:2.35" in viewer
    assert "ghost.opacity=.18" in viewer
    assert "addFocusInternals" in viewer
    assert "CONFIRMAT_6_3X50" in viewer


def test_r1050_handle_rules_and_simplified_hardware_are_visible():
    viewer = read("kitchen-webgl-r1050.js")
    grande = read("grande-r1048.js")
    assert "p.y=1000" in viewer
    assert "spec.h/2)-40" in viewer
    assert "addHandleBar(p,false)" in viewer
    assert "addHandleBar(p,true)" in viewer
    assert "addLegs(room,m)" in viewer
    assert "addHinges(room,m,count)" in viewer
    assert "doorHandleY=Math.min(H-120,1000)" in grande
    assert "drawerHandleY=base+S.drawerHeight-40" in grande
    assert "Hinge cup L" in grande
    assert "Drawer slide L" in grande


def test_r1050_material_presets_reach_actual_webgl_room_materials():
    viewer = read("kitchen-webgl-r1050.js")
    model = read("model.js")
    assert "document.documentElement.dataset.floorPreset" in model
    assert "document.documentElement.dataset.wallPreset" in model
    assert "PRESETS={" in viewer
    assert "floor:pick('floor','floorPreset'" in viewer
    assert "wall:pick('walls','wallPreset'" in viewer


def test_r1050_worktop_and_plinth_keep_4100_max_and_worktop_overhang():
    viewer = read("kitchen-webgl-r1050.js")
    segment = viewer[viewer.index("function segmentBy4100"):viewer.index("function addWorktopAndPlinth")]
    assert "span<=4100+.001" in segment
    assert "last boundary <= 4100" in segment
    worktop = viewer[viewer.index("function addWorktopAndPlinth"):viewer.index("function textSprite")]
    assert "Math.min(...seg.map(m=>+m.y))-20" in worktop
    assert "'plinth'" in worktop
    assert "'worktop'" in worktop


def test_r1050_menu_three_contains_handles_and_menu_seven_is_export():
    html = read("workspace-r8.html")
    workspace = read("workspace-r8.js")
    assert '<button data-panel="upper" type="button"><span>03</span>Настройка модулей</button>' in html
    assert '<button data-panel="general" type="button"><span>07</span>Экспорт</button>' in html
    upper = workspace[workspace.index("if(panel==='upper')"):workspace.index("if(panel==='communications')")]
    general = workspace[workspace.index("if(panel==='general')"):workspace.index("$('panelBody').innerHTML")]
    assert "<h3>Ручки</h3>" in upper
    assert "<h3>Ручки</h3>" not in general
    assert "<h3>Экспорт</h3>" in general
    for token in ["Quadro · active", "XML .project", "BOM", "Деталировка", "Чертежи"]:
        assert token in general


def test_r1050_only_complexity_i_is_selectable():
    start = read("start.js")
    assert "value: 'I'" in start
    for value in ["II", "III", "IV", "V"]:
        assert f"value: '{value}', disabled: true" in start
    assert "complexity_category'&&value!=='I'" in start


def test_r1050_light_theme_forces_dark_brand_and_inputs_block_ios_zoom():
    css = read("r1050.css")
    assert 'html[data-theme="light"] .brand' in css
    assert 'html[data-theme="light"] .brand span' in css
    assert "color:#111!important" in css
    assert "input,select,textarea{font-size:16px!important}" in css


def test_r1050_js_syntax_if_node_is_available():
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not available")
    for name in [
        "production-r1050.js",
        "kitchen-webgl-r1050.js",
        "workspace-r1050.js",
        "ua-ui-r1050.js",
        "grande-r1050.js",
        "grande-r1048.js",
        "start.js",
        "workspace-r8.js",
        "pilot-shell.js",
    ]:
        path = STATIC / name
        result = subprocess.run([node, "--check", str(path)], capture_output=True, text=True)
        assert result.returncode == 0, f"{name}: {result.stderr}"
