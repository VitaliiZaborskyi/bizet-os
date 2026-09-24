from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "app" / "static"

def read(name: str) -> str:
    return (STATIC / name).read_text(encoding="utf-8")

def test_r9_direct_configuration_to_workspace_and_splash():
    js = read("start-room-handoff.js")
    splash = read("pilot-r8-shell.js")
    assert "window.location.assign('/workspace?project='" in js
    assert "/room-setup?project=" not in js
    assert "BizetTransition?.play" in js
    assert "@keyframes r8FlyZ" in splash
    assert "translate(-50%,-72vh)" in splash
    assert "translate(-145vw,-42%)" in splash
    assert "translate(145vw,-42%)" in splash
    assert "color:#2f7cff" in splash
    assert "data:audio/mpeg;base64," in splash

def test_r9_r8_ui_typography_with_document_century_gothic():
    for name in ["start.css","room-setup-r8.css","workspace-r8.css"]:
        assert "Century Gothic" not in read(name)
        assert "SF Pro Display" in read(name)
    assert "Century Gothic" in read("point-b.css")
    workspace = read("workspace-r8.css")
    assert ".r8-project-state{position:absolute;right:132px" in workspace
    assert ".r8-topbar .settings-wrap{position:absolute;right:18px" in workspace

def test_r9_start_visual_is_r8_except_brand_and_splash():
    css = read("start.css")
    html = read("index.html")
    shell = read("pilot-r8-shell.js")
    assert ".choice-card" in css
    assert "font-family: Inter" in css
    assert 'class="brand-master">ZABORSKY' in html
    assert 'class="brand-main">BIZET <i>OS</i>' in html
    assert "color:#2f7cff" in shell

def test_r9_role_aware_producer_hub_has_four_demo_profiles():
    js = read("owner-qa-business.js")
    for token in ["BIZET Furniture","Zaborsky Kitchens","BIZET Sofa","Nordline Interiors"]:
        assert token in js
    for token in ["multiplier:2.0","multiplier:2.3","multiplier:1.8","multiplier:2.6"]:
        assert token in js
    assert "CUSTOMER" in js and "MANUFACTURER" in js and "ADMIN" in js
    assert "Commercial Proposal" in js
    assert 'font-family:"Century Gothic"' in js

def test_r9_customer_role_does_not_render_cost_or_bom_in_customer_view():
    js = read("owner-qa-business.js")
    customer = js[js.index("function showCustomer"):js.index("function showManufacturer")]
    assert "bom.cost" not in customer
    assert "BOM" not in customer
    assert "Себестоимость" in customer
    assert "restricted" in customer

def test_r9_module_focus_and_custom_controls_are_wired():
    html = read("workspace-r8.html")
    model = read("model.js")
    for token in ["moduleFocusCanvas","moduleFacadeColor","moduleCarcassColor","moduleFacadeCount","moduleShelfType","moduleShelfCount","moduleDrawerCount","moduleDrawerLayout","moduleHandleOrientation","moduleHandleOffset"]:
        assert token in html
    assert "function renderFocus()" in model
    assert "module_custom_settings" in model
    assert "drawerLayoutOptions" in model
    assert "Цельный распашной фасад не может быть шире 597 мм" in model
    assert "Применить настройку ко всем совместимым модулям" in model

def test_r9_3d_faucet_handles_oven_and_600_fridge_rule():
    js = read("pilot-3d.js")
    assert "module.kind==='SINK'" in js
    assert "stem=topZ+150" in js
    assert "handle_orientation" in js
    assert "module.drawer_count" in js
    assert "module.kind==='OVEN'" in js
    assert "module.kind==='TALL_OVEN'" in js
    assert "if(width>600)" in js

def test_r9_point_b_uses_open_service_tariffs_and_live_drawer_count():
    js = read("point-b.js")
    assert "ASSEMBLY_M2:0,PACKING_M2:0,INSTALL_M2:0,DELIVERY_TRIP:0,RPR_HOUR:0" in js
    assert "OPEN / NOT INCLUDED — тариф не заморожен" in js
    assert "Number(m.drawer_count)||2" in js
    assert "Винт ручки M4×25" in js
    assert "2 шт на ручку" in js
    assert "Facade Drawer" in js
    assert "Нижний выдвижной ящик под духовкой" in js


def test_r9_handoff_scripts_do_not_contain_accidental_literal_newline_escapes():
    handoff = read("start-room-handoff.js")
    point_b = read("point-b.js")
    assert ");\\n      window.location.assign" not in handoff
    assert "}\\n      if(m.kind==='DRAWERS')" not in point_b
    assert ");\\n    if(hw.M4_HANDLE)" not in point_b


def test_r91_splash_uses_approved_masks_and_full_audio_duration():
    shell = read("pilot-r8-shell.js")
    for asset in ["zaborsky_clean_mask.png", "bizet_clean_mask.png", "os_clean_mask.png"]:
        assert (STATIC / "brand" / asset).exists()
        assert f"/static/brand/{asset}" in shell
    assert "MIN_SPLASH_MS=5600" in shell
    assert "audio.addEventListener('ended'" in shell
    assert "needs-gesture" in shell
    assert "r8-sound-prompt" in shell


def test_r91_top_right_controls_are_fixed_and_russian_palette_is_localized():
    shell = read("pilot-r8-shell.js")
    start = read("start.js")
    assert "position:absolute!important;right:18px!important;top:50%!important" in shell
    assert "ru: 'Светлое'" in start
    assert "ru: 'Тёмное'" in start


def test_r91_workspace_opens_on_3d_without_automatic_room_editor():
    html = read("workspace-r8.html")
    js = read("workspace-r8.js")
    css = read("workspace-r8.css")
    assert 'id="editorPanel" hidden' in html
    assert '<button data-panel="room"' in html
    assert "let activePanel=null" in js
    assert "selectPanel('room')" not in js[js.index("async function ready"):js.index("ready();")]
    assert "requestAnimationFrame(()=>{rt.render();requestAnimationFrame(()=>rt.render())})" in js
    assert "#modelCanvas{position:absolute" in css


def test_r91_module_focus_is_rotatable_and_technical():
    model = read("model.js")
    renderer = read("pilot-3d.js")
    assert "focusCamera" in model
    assert "focusCanvas?.addEventListener('pointermove'" in model
    assert "focusMode:true" in model
    assert ".show==='function'" in model
    assert "function drawFocusInternals" in renderer
    for token in ["18 mm carcass panels", "Drawer boxes / trays", "Schematic adjustable legs", "Hinges", "Fasteners"]:
        assert token in renderer
    assert "drawModuleRunDimensions" in renderer


def test_r91_light_controls_use_dark_text_in_both_themes():
    css = read("workspace-r8.css")
    setup = read("room-setup-r8.css")
    assert "background:#f3f1ec!important;color:#171716!important" in css
    assert 'html[data-theme="dark"] .r8-pill' in css
    assert "background:#f3f1ec!important;color:#171716!important" in setup


def test_r91_commercial_proposal_is_one_kitchen_summary_not_module_rows():
    js = read("owner-qa-business.js")
    proposal = js[js.index("function printProposal"):js.index("function refresh")]
    assert "proposalSnapshot" in js
    assert "modelCanvas" in js and "toDataURL('image/png')" in js
    assert "configurationLabel" in js
    assert "runSummary" in js
    assert "Список услуг по изделиям" in proposal
    assert "Изображение / схема" in proposal
    assert "Комплектация" in proposal
    assert "Детальная разбивка по модулям" in proposal
    assert "moduleSpec(d.modules).map" not in proposal
    assert "DEFERRED: one-sheet comparison" in js
