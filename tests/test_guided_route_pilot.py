from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

ROOT = Path(__file__).resolve().parents[1]
client = TestClient(app)


def read_static(name: str) -> str:
    return (ROOT / 'app' / 'static' / name).read_text(encoding='utf-8')


def test_new_guided_routes_are_served():
    for path in ['/linear-span', '/dimensions', '/guided?stage=ceiling', '/model', '/materials']:
        response = client.get(path)
        assert response.status_code == 200


def test_straight_configuration_asks_wall_span_before_dimensions():
    index = read_static('index.html')
    override = read_static('guided-route-start.js')
    linear = read_static('linear-span.js')
    assert '/static/guided-route-start.js' in index
    assert "configuration.startsWith('WALL_') ? '/linear-span' : '/dimensions'" in override
    for mode in ['FULL_WALL', 'LEFT_OFFSET', 'RIGHT_OFFSET', 'BOTH_OFFSETS']:
        assert mode in linear
    assert 'linear_left_offset_mm' in linear
    assert 'linear_right_offset_mm' in linear
    assert '/dimensions?project=' in linear


def test_dimensions_screen_uses_configuration_aware_surfaces():
    html = read_static('dimensions.html')
    js = read_static('dimensions.js')
    assert 'Укажите размеры помещения' in html
    assert "L_LEFT:['A','B']" in js
    assert "L_RIGHT:['A','C']" in js
    assert "U_SHAPE:['A','B','C']" in js
    assert 'roomCanvas' in html
    assert 'activeWalls.includes' in js
    assert 'wall_heights' in js
    assert '/guided?stage=ceiling' in js


def test_dimensions_use_locked_perspective_and_real_dimension_lines():
    html = read_static('dimensions.html')
    js = read_static('dimensions.js')
    renderer = read_static('pilot-3d.js')
    assert '/static/pilot-3d.js' in html
    assert 'BizetPilot3D.drawRoomScene' in js
    assert "dimension_camera_mode:'LOCKED_PERSPECTIVE_3D'" in js
    assert 'Перспективное 3D · камера зафиксирована' in renderer
    assert 'dimensionLine' in renderer
    assert 'drawRoomDimensions' in renderer
    assert 'dimensionReadout' not in html
    assert "addEventListener('pointermove'" not in js
    assert "addEventListener('wheel'" not in js


def test_theme_and_full_settings_shell_persist_after_configuration():
    shell = read_static('pilot-shell.js')
    shell_css = read_static('pilot-shell.css')
    for page in ['linear-span.html', 'dimensions.html', 'guided.html', 'model.html', 'materials.html']:
        html = read_static(page)
        assert '/static/pilot-shell.js' in html
        assert '/static/pilot-shell.css' in html
    assert "const THEME_KEY = 'bizet_os_theme'" in shell
    assert "const LANGUAGE_KEY = 'bizet_os_language'" in shell
    for token in ['Тема', 'Язык', 'Обратная связь', 'Как пользоваться системой', 'Войти', 'Регистрация']:
        assert token in shell
    assert 'html[data-theme="dark"]' in shell_css


def test_ceiling_and_appliances_remain_one_question_screens():
    js = read_static('guided.js')
    for title in [
        'Выберите подход к потолку',
        'Будет ли холодильник?',
        'Выберите положение холодильника',
        'Выберите тип холодильника',
        'Выберите ширину холодильника',
        'Выберите положение мойки',
        'Выберите тип монтажа мойки',
        'Сколько чаш у мойки?',
        'Планируется измельчитель отходов?',
        'Будут фильтры под мойкой?',
        'Выберите тип варочной панели',
        'Выберите тип посудомоечной машины',
        'Выберите тип вытяжки',
        'Выберите ширину вытяжки',
        'Выберите положение духового шкафа',
        'Расстояние до верхних модулей',
        'Укажите коммуникации',
    ]:
        assert title in js


def test_sink_route_contains_mount_bowls_disposer_and_filters():
    js = read_static('guided.js')
    for token in [
        "choice('TOP_MOUNT','Накладная на столешницу'",
        "choice('FLUSH','Вровень со столешницей'",
        "choice('UNDERMOUNT','Под столешницей'",
        "choice(1,'Одна чаша'",
        "choice(2,'Две чаши'",
        "'sink-disposer'",
        "'sink-filters'",
        'sink_disposer',
        'sink_filters',
    ]:
        assert token in js


def test_hood_sizes_apply_after_both_hood_types():
    js = read_static('guided.js')
    assert "const hoodSizes=[500,600,800,900,1000]" in js
    assert "if(current==='hood-type')return value==='BUILT_IN'?'hood-integrated-subtype':'hood-size'" in js
    assert "if(current==='hood-integrated-subtype')return'hood-size'" in js
    assert 'hood_width_mm' in js


def test_tall_oven_branch_contains_microwave_and_coffee_options():
    js = read_static('guided.js')
    for token in [
        'Будет микроволновая печь в пенале?',
        "choice('BUILT_IN','Встраиваемая','▥','600 × 450 мм')",
        "microwave_compartment_height_mm:350",
        'Будет кофемашина в пенале?',
        "coffee_width_mm:600,coffee_height_mm:450",
        "choice('FIXED_SHELF','На обычной полке'",
        "choice('PULLOUT_LOCKING','На выдвижной полке с фиксатором'",
        "choice('HINGED_LEFT','Петли слева'",
        "choice('HINGED_RIGHT','Петли справа'",
        "choice('LIFT_UP_HL','Вертикально вверх'",
        'Aventos HL или аналог',
    ]:
        assert token in js


def test_upper_gap_defaults_to_600_and_clamps_to_550_without_maximum():
    js = read_static('guided.js')
    assert "Number(inputs.upper_gap_mm)||600" in js
    assert "Math.max(550,value)" in js
    assert "inputField('Расстояние от столешницы','inputValue',Number(inputs.upper_gap_mm)||600,550)" in js
    assert 'max="' not in js[js.index("stage==='upper-gap'"):js.index("function renderCommunications")]


def test_model_is_rotatable_numbered_perspective_and_uses_only_active_walls():
    html = read_static('model.html')
    model_js = read_static('model.js')
    renderer = read_static('pilot-3d.js')
    assert 'id="modelCanvas"' in html
    assert 'id="moduleStrip"' in html
    assert 'BizetPilot3D.drawKitchenScene' in model_js
    assert "canvas.addEventListener('pointermove'" in model_js
    assert "canvas.addEventListener('wheel'" in model_js
    assert "return walls.flatMap(w=>arrangeWall(w,grouped[w],room))" in model_js
    assert 'linear_left_offset_mm' in model_js
    assert 'linear_right_offset_mm' in model_js
    assert 'sorted.forEach((m,i)=>m.number=i+1)' in model_js
    assert 'drawNumber(ctx,front,module.number,c)' in renderer
    assert 'label(ctx' not in renderer


def test_model_uses_existing_pilot_module_references_and_upper_gap():
    model_js = read_static('model.js')
    renderer = read_static('pilot-3d.js')
    assert 'LOWER_DEPTH=560' in model_js
    assert 'LOWER_TOTAL_H=900' in model_js
    assert 'CUTLERY_W=400' in model_js
    assert 'UPPER_DEPTH=320' in model_js
    assert 'UPPER_HOOD_DEPTH=350' in model_js
    assert 'UPPER_MAX_H=1000' in model_js
    assert "Math.max(550,Number(inputs.upper_gap_mm)||600)" in model_js
    assert "Number(inputs.hood_width_mm)||600" in model_js
    assert "'SINK'" in model_js
    assert "'DRAWERS'" in model_js
    assert "'COOKTOP'" in model_js
    assert 'Остаточное пространство' in model_js
    assert 'drawWorktop' in renderer
    assert 'drawPlinth' in renderer


def test_model_and_materials_keep_deferred_rules_explicit():
    model_js = read_static('model.js')
    materials = read_static('materials.html')
    assert '/recalculate' in model_js
    assert 'module_offsets_mm' in model_js
    assert 'Полный зависимый пересчёт соседних модулей — следующий слой.' in model_js
    assert 'Финальное количество и ширины модулей должен определить Module Engine' in model_js
    assert 'По умолчанию из комплектации' in materials
    assert 'следующий слой' in materials


def test_custom_configuration_continues_to_new_dimensions_screen():
    js = read_static('custom-configuration.js')
    assert '/dimensions?project=' in js
    assert '/room?project=' not in js
