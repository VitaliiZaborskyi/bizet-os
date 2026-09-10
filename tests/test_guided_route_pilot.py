from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

ROOT = Path(__file__).resolve().parents[1]
client = TestClient(app)


def read_static(name: str) -> str:
    return (ROOT / 'app' / 'static' / name).read_text(encoding='utf-8')


def test_new_guided_routes_are_served():
    for path in ['/dimensions', '/guided?stage=ceiling', '/model', '/materials']:
        response = client.get(path)
        assert response.status_code == 200


def test_start_configuration_routes_to_dimensions_not_legacy_room():
    index = read_static('index.html')
    override = read_static('guided-route-start.js')
    assert '/static/guided-route-start.js' in index
    assert '/dimensions?project=' in override


def test_dimensions_screen_uses_configuration_aware_surfaces():
    html = read_static('dimensions.html')
    js = read_static('dimensions.js')
    assert 'Укажите размеры помещения' in html
    assert "L_LEFT:['A','B']" in js
    assert "L_RIGHT:['A','C']" in js
    assert "U_SHAPE:['A','B','C']" in js
    assert "data-surface=\"FLOOR\"" in html
    assert 'activeWalls.includes' in js
    assert 'wall_heights' in js
    assert '/guided?stage=ceiling' in js


def test_ceiling_and_appliances_are_separate_one_question_screens():
    js = read_static('guided.js')
    for title in [
        'Выберите подход к потолку',
        'Укажите, будет ли холодильник',
        'Выберите положение холодильника',
        'Выберите тип холодильника',
        'Выберите ширину холодильника',
        'Выберите положение мойки',
        'Выберите тип варочной панели',
        'Выберите тип посудомоечной машины',
        'Выберите тип вытяжки',
        'Выберите положение духового шкафа',
        'Укажите коммуникации',
    ]:
        assert title in js


def test_guided_route_contains_owner_confirmed_appliance_options():
    js = read_static('guided.js')
    for token in [
        "choice(600,'600 мм'",
        "choice(900,'900 мм'",
        "choice(1200,'1200 мм'",
        "FRIDGE_ONLY",
        "FREEZER_ONLY",
        "FRIDGE_FREEZER",
        "choice(450,'450 мм'",
        "choice(300,'300 мм · Domino'",
        "choice('GAS','Газовая'",
        "choice('INDUCTION','Индукционная'",
        "choice('TELESCOPIC','Телескопическая'",
        "choice(500,'500 мм'",
        "choice(800,'800 мм'",
    ]:
        assert token in js


def test_model_and_materials_are_explicit_scaffolds_not_fake_final_logic():
    model_js = read_static('model.js')
    materials = read_static('materials.html')
    assert '/recalculate' in model_js
    assert 'UI-пилот' in model_js
    assert 'module_offsets_mm' in model_js
    assert 'Заполнение системой' in model_js
    assert 'Количество и размеры модулей в placeholder не придумываются.' in model_js
    assert 'По умолчанию из комплектации' in materials
    assert 'следующий слой' in materials


def test_custom_configuration_continues_to_new_dimensions_screen():
    js = read_static('custom-configuration.js')
    assert '/dimensions?project=' in js
    assert '/room?project=' not in js
