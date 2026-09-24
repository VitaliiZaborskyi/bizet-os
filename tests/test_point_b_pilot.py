from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "app" / "static"


def read(name: str) -> str:
    return (STATIC / name).read_text(encoding="utf-8")


def test_point_b_caps_straight_modules_at_900_and_uses_category_i_depths():
    model = read("model.js")
    assert "LOWER_DEPTH=510" in model
    assert "UPPER_DEFAULT_H=750" in model
    assert "MAX_STRAIGHT_MODULE_W=900" in model
    assert "Math.ceil(remaining/MAX_STRAIGHT_MODULE_W)" in model
    assert "Прямой модуль не может быть шире 900 мм" in model


def test_point_b_final_price_and_document_package_are_wired():
    html = read("workspace-r8.html")
    js = read("point-b.js")
    assert "/static/point-b.js?v=96" in html
    assert "/static/point-b.css?v=96" in html
    assert "Итоговая стоимость" in js
    assert "Комплект документов" in js
    assert "COST × 2" in js
    assert "client=cost*2" in js


def test_point_b_detailing_has_exact_13_columns_and_nested_drawer_codes():
    js = read("point-b.js")
    headers = [
        "№","Материал","Уникальный код","Наименование детали","Длина","Ширина",
        "Количество","Ед. изм.","Наименование кромки","Кромка по длинной стороне",
        "Кромка по короткой стороне","Дополнительные обработки","Примечание",
    ]
    for header in headers:
        assert header in js
    assert "Drawer Left" in js
    assert "p+'001'" in js
    assert "p+'005'" in js


def test_point_b_prices_include_user_fixed_category_i_values():
    js = read("point-b.js")
    for token in [
        "CARCAS_M2:776","FACADE_M2:1200","HDF_M2:120",
        "CUT_M:20","EDGE_LABOR_M:30","EDGE_MATERIAL_M:30",
        "HOLE:7","HINGE_CUP:40","GROOVE_M:40",
        "HINGE_BLUM:200","LEG:25","LEG_CLIP:12","SCREW:0.30",
        "HANDLE:200","SHELF_SUPPORT:12","CONFIRMAT:1","MINIFIX:5",
        "DOWEL:0.8","RAFIX:10","DRAWER_SLIDE:1200","METAL_DRAWER:2200",
        "EURO_SCREW:1.5","WORKTOP_SLAB:8000","WORKTOP_LENGTH_MM:4100",
    ]:
        assert token in js


def test_point_b_worktop_bills_whole_4100_slabs():
    js = read("point-b.js")
    assert "Math.ceil(lowerRun/PRICES.WORKTOP_LENGTH_MM)" in js
    assert "Клиент оплачивает целую заготовку; остаток не вычитается" in js


def test_point_b_contains_kitchen_and_communications_drawings():
    js = read("point-b.js")
    assert "WALL A · KITCHEN ASSEMBLY SCHEME" in js
    assert "WALL A · COMMUNICATIONS SCHEME" in js
    assert "Z/elevation remains USER CONFIRMATION REQUIRED" in js
    assert "BIZET_Wall_A_Kitchen.svg" in js
    assert "BIZET_Wall_A_Communications.svg" in js


def test_point_b_variant_switch_cannot_open_module_dialog():
    js = read("workspace-r8.js")
    assert "document.getElementById('moduleDialog')?.close?.()" in js
    assert "variantControls.addEventListener" in js
