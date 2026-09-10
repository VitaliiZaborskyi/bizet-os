from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_first_screen_has_no_back_navigation_but_later_steps_keep_it():
    index = read("app/static/index.html")
    start = read("app/static/start.js")
    assert 'id="backButton"' in index and 'hidden' in index.split('id="backButton"', 1)[1].split('>', 1)[0]
    assert "$('backButton').hidden = currentStep === 0" in start


def test_theme_switching_is_real_and_persisted():
    start = read("app/static/start.js")
    shell = read("app/static/pilot-shell.js")
    for source in (start, shell):
        assert "document.documentElement.dataset.theme" in source
        assert "localStorage.setItem" in source
    assert "bizet:themechange" in shell


def test_dishwasher_is_optional_and_has_sink_proximity_route():
    guided = read("app/static/guided-r5.js")
    assert "Будет ли посудомоечная машина?" in guided
    assert "dishwasher_present:'NO'" in guided
    assert "Должна ли ПММ стоять рядом с мойкой?" in guided
    assert "С какой стороны от мойки поставить ПММ?" in guided
    assert "dishwasher_near_sink" in guided
    assert "dishwasher_side" in guided


def test_generated_model_precedes_communications_review():
    guided = read("app/static/guided-r5.js")
    model = read("app/static/model-r5.js")
    main = read("app/main.py")
    assert "Собрать 3D-модель" in guided
    assert "communications_status:'AUTO_AFTER_MODEL'" in guided
    assert "Проверить коммуникации" in model
    assert "/communications?project=" in model
    assert '@app.get("/communications"' in main


def test_model_restores_rotation_pinch_zoom_and_initial_fit():
    base = read("app/static/model.js")
    pre = read("app/static/model-r5-pre.js")
    post = read("app/static/model-r5.js")
    assert "pointermove" in base and "camera.yaw" in base
    assert "distanceScale" in pre and "narrow?1.14:1.06" in pre
    assert "touches.size<2" in post
    assert "WheelEvent('wheel'" in post
    assert "щипок" in post.lower()


def test_fridge_is_outermost_and_tall_oven_is_adjacent_on_same_wall():
    pre = read("app/static/model-r5-pre.js")
    guided = read("app/static/guided-r5.js")
    assert "fridges.length&&oven" in pre
    assert "onLeft?[...fridgeOrder,oven,...others]:[...others,oven,...fridgeOrder]" in pre
    assert "FRIDGE_OUTERMOST_OVEN_ADJACENT_IF_SAME_WALL" in guided


def test_oven_vertical_position_depends_on_extra_tall_appliances():
    pre = read("app/static/model-r5-pre.js")
    guided = read("app/static/guided-r5.js")
    assert "facadeTop-facadeHeight*.5" in pre
    assert "RAISED_TO_LOWER_FACADE_TOP" in pre
    assert "LOWERED_HALF_LOWER_FACADE" in pre
    assert "microwave_present==='YES'||inputs.coffee_present==='YES'" in guided


def test_ceiling_and_corner_filler_rules_are_preserved_as_r5_metadata():
    pre = read("app/static/model-r5-pre.js")
    post = read("app/static/model-r5.js")
    assert "ceiling==='STRETCH_A'?120" in pre
    assert "ceiling==='STRETCH_B'||ceiling==='GYPSUM'?18:0" in pre
    assert "wall_l_filler_required:true" in pre
    assert "corner_front_l_filler_required" in pre
    assert "stretch_profile_filler_height_mm:inputs.ceiling==='STRETCH_A'?120:null" in post


def test_communications_are_generated_from_model_and_only_tap_editable():
    html = read("app/static/communications-r5.html")
    js = read("app/static/communications-r5.js")
    assert "BIZET OS уже расставил необходимые точки" in html
    assert "generateAutomaticPoints" in js
    assert "bizet_r5_model_snapshot" in js
    assert "wallCanvas').addEventListener('click'" in js
    assert "pointX" in js and "pointZ" in js
    assert "pointermove" not in js
    assert "PDF для строителей" in html and "window.print()" in js


def test_window_creates_radiator_and_curtain_defaults():
    js = read("app/static/communications-r5.js")
    assert "Есть ли радиатор под окном?" in js
    assert "depth_mm:130" in js
    assert "width_mm:base.width_mm" in js
    assert "Есть штора и подшторник?" in js
    assert "base.width_mm+200" in js
    assert "base.x_mm-100" in js
    assert "height_mm:100" in js
    assert "depth_mm:200" in js


def test_room_features_trigger_recalculation_before_materials():
    js = read("app/static/communications-r5.js")
    assert "/recalculate" in js
    assert "RECALCULATED_AFTER_ROOM_FEATURE" in js
    assert "/materials?project=" in js


def test_freehand_custom_geometry_normalizes_90_45_and_arcs():
    html = read("app/static/custom-configuration.html")
    js = read("app/static/custom-configuration-r5.js")
    assert "/static/custom-configuration-r5.js" in html
    assert "Math.PI/4" in js
    assert "12*Math.PI/180" in js
    assert "detectArc" in js and "circleFrom3" in js
    assert "Укажите радиус дуги" in js
    assert "Укажите хорду дуги" in js
    assert "radius_mm" in js and "chord_mm" in js
    assert "NORMALIZED_GEOMETRY_R5" in js
