from app.domain.models import ProjectInput
from app.engine.rules import DecisionEngine


def base_project(**overrides):
    data = {
        "object_type": "NEW_BUILD",
        "configuration": "LEFT_WALL",
        "opening_system": "PUSH",
        "room": {
            "wall_length": {"value_mm": 3000, "source": "USER_ENTERED"},
            "room_height": {"value_mm": 2700, "source": "USER_ENTERED"},
            "left_wall": {"deviation_mm": 0, "is_deep_wall": True},
            "right_wall": {"deviation_mm": 0, "is_deep_wall": False},
            "finished_floor": True,
            "skirting_present": False,
            "ceiling_type": "OPEN_GAP",
            "ceiling_gap_mm": 100,
        },
        "communications": [
            {"type": "DRAIN", "x_mm": 1100, "confirmed": True},
            {"type": "WATER", "x_mm": 1100, "confirmed": True},
            {"type": "COOKTOP_POWER", "x_mm": 2300, "confirmed": True},
            {"type": "APPLIANCE_POWER", "x_mm": 700, "confirmed": True},
        ],
        "appliances": [
            {"type": "FRIDGE_BUILTIN", "width_mm": 600, "side": "LEFT", "built_in": True},
            {"type": "SINK", "width_mm": 500},
            {"type": "DISHWASHER", "width_mm": 450},
            {"type": "COOKTOP", "width_mm": 600},
            {"type": "OVEN", "width_mm": 600},
        ],
        "preferences": {"budget_priority": True, "users_count": 2, "cutlery_tray": True, "comfort_mode": False},
    }
    for k,v in overrides.items(): data[k]=v
    return ProjectInput.model_validate(data)


def test_length_arithmetic_is_exact_for_valid_layout():
    p=base_project()
    candidates=DecisionEngine.generate(p)
    assert candidates
    c=candidates[0]
    assert c.used_length_mm == c.room_length_mm
    assert c.residual_mm == 0


def test_handle_at_wall_reserves_40_l_filler():
    p=base_project(opening_system="HANDLE")
    c=DecisionEngine.generate(p)[0]
    left=[i for i in c.items if i.id=="filler-left"][0]
    assert left.width_mm == 40
    assert left.metadata["filler_type"] == "L_SHAPED"


def test_push_at_straight_wall_uses_18_end_filler():
    p=base_project(opening_system="PUSH")
    c=DecisionEngine.generate(p)[0]
    left=[i for i in c.items if i.id=="filler-left"][0]
    assert left.width_mm == 18


def test_wall_deviation_over_22_requires_human_review():
    p=base_project()
    p.room.left_wall.deviation_mm=30
    c=DecisionEngine.generate(p)[0]
    assert c.validation.status.value in {"HUMAN_REVIEW","STOP"}
    assert any("exceeds 22" in x for x in c.validation.human_review)


def test_gola_fridge_closer_requires_human_review():
    p=base_project(opening_system="GOLA")
    p.appliances[0].has_door_closer=True
    c=DecisionEngine.generate(p)[0]
    assert c.validation.status.value == "HUMAN_REVIEW"
    assert any("door closers" in x for x in c.validation.human_review)


def test_grid_rule_marks_nonstandard_only_when_needed():
    p=base_project()
    c=DecisionEngine.generate(p)[0]
    # 3000 minus 18 filler, fixed appliances and 400 cutlery can leave non-grid residual due 18 mm edge filler.
    # The pilot allows the resulting simple hinged nonstandard module and traces warning.
    nonstd=[i for i in c.items if i.kind.value=="HINGED" and not i.standard_width]
    assert nonstd or any("Nonstandard" in w for w in c.validation.warnings)


def test_room_engine_accepts_obstacle_and_confidence_metadata():
    p = base_project()
    p.room.wall_depth.value_mm = 650
    from app.domain.models import RoomObstacle
    p.room.obstacles = [RoomObstacle(
        id="obs-1", type="PROJECTION", x_mm=700, width_mm=250, depth_mm=180,
        height_mm=2700, bottom_mm=0, source="USER_ENTERED", confirmed=True
    )]
    from app.engine.room import RoomEngine
    room = RoomEngine.resolve(p)
    assert room.wall_length_mm == 3000
    assert room.wall_depth_mm == 650
    assert len(room.obstacles) == 1
    assert any(t.rule_id == "ROOM-OBSTACLE-01" for t in room.rule_trace)


def test_estimated_room_dimension_generates_warning():
    p = base_project()
    from app.domain.enums import ConfidenceSource
    p.room.wall_length.source = ConfidenceSource.ESTIMATED
    from app.engine.room import RoomEngine
    room = RoomEngine.resolve(p)
    assert any("wall length is estimated" in w for w in room.warnings)


def test_room_engine_between_walls_has_two_active_sides():
    p = base_project(configuration="BETWEEN_WALLS")
    from app.engine.room import RoomEngine
    room = RoomEngine.resolve(p)
    assert room.active_wall_sides == ["LEFT", "RIGHT"]


def test_unconfirmed_scan_communication_generates_warning():
    p = base_project()
    from app.domain.enums import ConfidenceSource
    p.communications[0].source = ConfidenceSource.SCAN_DETECTED
    p.communications[0].confirmed = False
    from app.engine.room import RoomEngine
    room = RoomEngine.resolve(p)
    assert any("scan-detected communication" in w for w in room.warnings)
