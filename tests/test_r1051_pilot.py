from pathlib import Path
import shutil
import subprocess
import pytest

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "app" / "static"

def read(name):
    return (STATIC / name).read_text(encoding="utf-8")

def test_r1051_current_version_and_assets():
    main=(ROOT/"app"/"main.py").read_text(encoding="utf-8")
    workspace=read("workspace-r8.html")
    index=read("index.html")
    grande=read("grande-r1046.html")
    assert 'version="R10.5.1"' in main
    assert '/static/r1051.css?v=1051' in workspace
    assert '/static/r1051.css?v=1051' in index
    assert '/static/r1051.css?v=1051' in grande
    for asset in ["production-r1050.js?v=1051","kitchen-webgl-r1050.js?v=1051","workspace-r1050.js?v=1051","ua-ui-r1050.js?v=1051"]:
        assert asset in workspace
    assert '<link rel="stylesheet" href="/static/r1050.css?v=1051">' in workspace

def test_r1051_room_source_is_native_ua_and_desktop_cards_do_not_overlap():
    handoff=read("start-room-handoff.js")
    css=read("r1051.css")
    for token in ["Як почнемо роботу з приміщенням?","Оберіть джерело вхідних даних","Завантажити файл","PDF або фотографія приміщення.","Сканування приміщення буде підключено"]:
        assert token in handoff
    assert ".room-source-card .room-source-copy" in css
    assert "flex:0 0 118px!important" in css
    assert "position:static!important" in css

def test_r1051_root_always_starts_from_first_step_but_keeps_project():
    start=read("start.js")
    assert "currentStep = 0;" in start
    assert "project.context?.[step.field]" in start
    assert "/reopen" in start
    assert "localStorage.removeItem" not in start[start.index("// R10.5.1:"):]

def test_r1051_deep_shadow_uses_real_sao_pipeline():
    html=read("workspace-r8.html")
    viewer=read("kitchen-webgl-r1050.js")
    for asset in ["EffectComposer.js","ShaderPass.js","CopyShader.js","SAOShader.js","DepthLimitedBlurShader.js","UnpackDepthRGBAShader.js","RenderPass.js","SAOPass.js"]:
        assert asset in html
    assert "new THREE.SAOPass" in viewer
    assert "saoPass.params.saoIntensity" in viewer
    assert "if(deepShadow&&composer)composer.render()" in viewer
    assert "DS is ambient/contact occlusion" in viewer

def test_r1051_randomization_rebuild_cleans_door_pivots_and_surfaces_are_double_sided():
    viewer=read("kitchen-webgl-r1050.js")
    grande=read("grande-r1048.js")
    front=viewer[viewer.index("function makeFront"):viewer.index("function addLegs")]
    assert "furnitureGroup.add(pivot)" in front
    assert "scene.add(pivot)" not in front
    assert "side:THREE.DoubleSide" in viewer
    assert "m.side=THREE.DoubleSide" in grande

def test_r1051_dimensions_are_outside_kitchen_and_focus_bbox():
    viewer=read("kitchen-webgl-r1050.js")
    block=viewer[viewer.index("if(options.showDimensions"):viewer.index("body.dispose();front.dispose();")]
    assert "safe=520" in block
    assert "D+safe" in block
    assert "L+safe" in block
    assert "safe=360" in block

def test_r1051_isolation_owns_only_selected_module_and_contains_hardware():
    viewer=read("kitchen-webgl-r1050.js")
    focus=viewer[viewer.index("function addFocusInternals"):viewer.index("function lowerRuns")]
    build=viewer[viewer.index("function buildFurniture"):viewer.index("function frame(")]
    assert "addLegs(room,m)" in focus
    assert "addHinges(room,m" in focus
    assert "CylinderGeometry(3.15,3.15,50" in focus
    assert "ghost.opacity=.18" in build
    assert "addFocusInternals(room,mods[0],ghost);addAppliance(room,mods[0])" in build
    assert "addLegs(room,mods[0])" not in build

def test_r1051_handles_face_facade_and_stay_inside_hinged_front():
    viewer=read("kitchen-webgl-r1050.js")
    handle=viewer[viewer.index("function addHandleBar"):viewer.index("function frontVector")]
    front=viewer[viewer.index("function makeFront"):viewer.index("function addLegs")]
    assert "post.position.set(vertical?0:s*52,vertical?s*42:0,10)" in handle
    assert "const handleHalf=62.5" in front
    assert "spec.h/2-40-handleHalf" in front

def test_r1051_worktop_seams_cooktop_and_sink_proxy_are_explicit():
    viewer=read("kitchen-webgl-r1050.js")
    assert "'worktop-seam'" in viewer
    assert "TorusGeometry" in viewer
    assert "'cooktop'" in viewer
    assert "'sink-proxy'" in viewer
    assert "visualizationProxy=true" in viewer
    assert "no production cutout is inferred" in viewer

def test_r1051_grande_drawer_count_is_geometry_constrained():
    grande=read("grande-r1048.js")
    assert "function grandeMaxDrawerCount" in grande
    assert "Math.min(1200,S.h-S.t)" in grande
    assert "field(tr('drawerCount'),'drawerCount',S.drawerCount,1,drawerMax,1)" in grande
    assert "constrainGrandeDrawers" in grande
    assert "Текущий максимум ящиков" in grande

def test_r1051_project3dc_has_strict_preflight_numeric_graph_and_canonical_dowels():
    production=read("production-r1050.js")
    for token in [
        "function preflight(model",
        "UNRESOLVED_DRILLING",
        "CONNECTION_NOT_PART_BOUND",
        "const parentId='1'",
        "String(1000+i)",
        "String(500000+i)",
        "connectionIdMap",
        "DOWEL_8X30",
        "materialId:'110:1'",
        "face={id:id+'-F'",
        "diameter:8,depth:12,type:'FACE'",
        "diameter:8,depth:22,type:'EDGE'",
    ]:
        assert token in production
    assert "BIZET_Quadro_Minimal_Repro_R1051.project" in production

def test_r1051_export_ui_exposes_preflight_and_minimal_quadro_repro():
    workspace=read("workspace-r8.js")
    glue=read("workspace-r1050.js")
    grande=read("grande-r1050.js")
    assert 'id="exportQuadroReproR1051"' in workspace
    assert "downloadQuadroRepro" in glue
    assert "bizet:export-preflight" in glue
    assert "grandeQuadroReproR1051" in grande
    assert "strict" in read("production-r1050.js") or "preflight" in read("production-r1050.js")

def test_r1051_grande_no_longer_invents_dowel_bom_quantity():
    grande=read("grande-r1048.js")
    assert "Math.max(8,S.shelvesLeft*4+S.shelvesRight*4)" not in grande
    assert "no dowel BOM line until a canonical connection is proven" in grande

def test_r1051_grande_deep_shadow_uses_sao():
    html=read("grande-r1046.html")
    overlay=read("grande-r1050.js")
    core=read("grande-r1048.js")
    assert "SAOPass.js" in html
    assert "new THREE.SAOPass" in overlay
    assert "window.BizetGrandeR1050Post" in overlay
    assert "BizetGrandeR1050Post?.render" in core

def test_r1051_js_syntax_if_node_available():
    node=shutil.which("node")
    if not node:
        pytest.skip("node is not available")
    for name in [
        "start.js","start-room-handoff.js","production-r1050.js","kitchen-webgl-r1050.js",
        "workspace-r8.js","workspace-r1050.js","grande-r1048.js","grande-r1050.js","ua-ui-r1050.js"
    ]:
        result=subprocess.run([node,"--check",str(STATIC/name)],capture_output=True,text=True)
        assert result.returncode==0, f"{name}: {result.stderr}"
