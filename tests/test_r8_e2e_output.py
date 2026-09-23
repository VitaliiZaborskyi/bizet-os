from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "app" / "static"


def read(name: str) -> str:
    return (STATIC / name).read_text(encoding="utf-8")


def test_e2e_pilot_enforces_900mm_generated_modules():
    model = read("model.js")
    assert "const LOWER_DEPTH=510" in model
    assert "splitResidual" in model
    assert "max=900" in model
    assert "maximum width" not in model.lower() or "900" in model
    assert "максимальная ширина — 900 мм" in model


def test_e2e_output_uses_frozen_category_i_prices_and_cost_x2():
    js = read("pilot-output-r8.js")
    for token in [
        "carcass_m2:776",
        "facade_m2:1200",
        "hdf_m2:120",
        "cut_lm:20",
        "edge_labor_lm:30",
        "edge_material_lm:30",
        "hole_regular:7",
        "hole_hinge:40",
        "groove_lm:40",
        "hinge_set:200",
        "leg:25",
        "clip:12",
        "confirmat:1",
        "minifix:5",
        "dowel:0.8",
        "rafix:10",
        "euro_screw:1.5",
        "screw_selftap:0.30",
        "handle:200",
        "shelf_support:12",
        "m4x25:0.50",
        "runner_hidden_set:1200",
        "drawer_metal_set:2200",
        "countertop_slab:8000",
    ]:
        assert token in js
    assert "knownCost*2" in js


def test_e2e_detail_export_has_exact_13_columns():
    js = read("pilot-output-r8.js")
    expected = [
        "№", "Material", "Unique code", "Part name", "Length", "Width", "Qty",
        "Unit", "Edge", "Edge long side", "Edge short side",
        "Additional processing", "Note",
    ]
    for label in expected:
        assert f"['{label}'" in js


def test_e2e_unique_codes_support_module_and_drawer_hierarchy():
    js = read("pilot-output-r8.js")
    assert "drawerNo==null" in js
    assert "String(idx).padStart(3,'0')" in js
    assert "Drawer Left" in js
    assert "Drawer Right" in js
    assert "Drawer Bottom" in js


def test_e2e_drawings_and_downloads_are_in_workspace():
    html = read("workspace-r8.html")
    js = read("pilot-output-r8.js")
    assert "/static/pilot-output-r8.js?v=100" in html
    assert "function kitchenSvg" in js
    assert "function commsSvg" in js
    assert "BIZET_OS_Details_" in js
    assert "BIZET_OS_BOM_" in js
    assert "BIZET_OS_Kitchen_Wall_A_" in js
    assert "BIZET_OS_Communications_Wall_A_" in js
    assert "pilotPrint" in js


def test_e2e_communication_output_is_derived_from_generated_modules():
    js = read("pilot-output-r8.js")
    for kind in ["SINK", "COOKTOP", "FRIDGE", "DISHWASHER", "UPPER_HOOD"]:
        assert f"'{kind}'" in js
    assert "Канализация" in js
    assert "Подача воды" in js
    assert "Питание варочной" in js


def test_variant_switch_suppresses_module_dialog():
    js = read("workspace-r8.js")
    model = read("model.js")
    assert "rt.suppressModuleOpen?.(900)" in js
    assert "document.getElementById('moduleDialog')?.close?.()" in js
    assert "suppressModuleOpenUntil" in model
