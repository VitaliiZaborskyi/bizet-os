from app.domain.models import ProjectInput
from app.engine.appliances import ApplianceResolver
from app.engine.compatibility import CompatibilityEngine


def project(appliances, communications=None, opening_system="PUSH"):
    return ProjectInput.model_validate({
        "object_type":"NEW_BUILD","configuration":"LEFT_WALL","opening_system":opening_system,
        "room":{"wall_length":{"value_mm":3000},"room_height":{"value_mm":2700},"ceiling_type":"OPEN_GAP"},
        "communications":communications or [],"appliances":appliances,"preferences":{}
    })


def test_builtin_fridge_resolves_hard_ventilation_rule():
    p=project([{"type":"FRIDGE_BUILTIN","width_mm":600,"built_in":True}],
              [{"type":"APPLIANCE_POWER","x_mm":700,"confirmed":True}])
    r=ApplianceResolver.resolve(p)
    assert any(x.rule_id=="A-FRIDGE-BI-02" and x.result_type.value=="HARD_RULE" for x in r.results)
    assert r.appliances[0].metadata["rear_convection_channel"] is True


def test_missing_required_power_is_stop_type():
    p=project([{"type":"OVEN","width_mm":600}])
    r=CompatibilityEngine.evaluate(p)
    assert any(x.result_type.value=="STOP" and x.data.get("connection")=="APPLIANCE_POWER" for x in r.stops)


def test_fridge_closer_gola_is_human_review_not_stop():
    p=project([{"type":"FRIDGE_BUILTIN","width_mm":600,"built_in":True,"has_door_closer":True}],
              [{"type":"APPLIANCE_POWER","x_mm":700,"confirmed":True}], opening_system="GOLA")
    r=CompatibilityEngine.evaluate(p)
    assert any(x.rule_id=="A-FRIDGE-BI-03" for x in r.human_review)
    assert not any(x.rule_id=="A-FRIDGE-BI-03" for x in r.stops)


def test_builtin_hood_has_depth_and_requires_human_route_review():
    p=project([{"type":"HOOD_BUILTIN","width_mm":600,"built_in":True}],
              [{"type":"APPLIANCE_POWER","x_mm":2000,"confirmed":True},{"type":"VENT","x_mm":2000,"confirmed":True}])
    a=ApplianceResolver.resolve(p)
    assert a.appliances[0].metadata["upper_carcass_depth_mm"]==350
    c=CompatibilityEngine.evaluate(p)
    assert any(x.rule_id=="HOOD-BI-ROUTE-01" for x in c.human_review)


def test_dishwasher_without_sink_is_stop():
    p=project([{"type":"DISHWASHER","width_mm":450}],
              [{"type":"APPLIANCE_POWER","x_mm":1200,"confirmed":True},{"type":"DRAIN","x_mm":1100,"confirmed":True},{"type":"WATER","x_mm":1100,"confirmed":True}])
    r=CompatibilityEngine.evaluate(p)
    assert any(x.rule_id=="A-DW-SINK-01" for x in r.stops)


def test_dishwasher_with_sink_exposes_hard_rule():
    p=project([{"type":"SINK","width_mm":500},{"type":"DISHWASHER","width_mm":450}],
              [{"type":"APPLIANCE_POWER","x_mm":1200,"confirmed":True},{"type":"DRAIN","x_mm":1100,"confirmed":True},{"type":"WATER","x_mm":1100,"confirmed":True}])
    r=CompatibilityEngine.evaluate(p)
    assert any(x.rule_id=="A-DW-SINK-01" and x.result_type.value=="HARD_RULE" for x in r.hard_rules)


def test_gas_cooktop_is_human_review_when_gas_point_present():
    p=project([{"type":"COOKTOP","width_mm":600,"cooktop_energy":"GAS"}],
              [{"type":"GAS","x_mm":2200,"confirmed":True}])
    r=CompatibilityEngine.evaluate(p)
    assert any(x.rule_id=="COMM-GAS-01" for x in r.human_review)


def test_tall_oven_power_policy_is_not_behind_appliance():
    p=project([{"type":"OVEN","width_mm":600,"placement":"TALL_UNIT"}],
              [{"type":"APPLIANCE_POWER","x_mm":800,"confirmed":True}])
    r=ApplianceResolver.resolve(p)
    assert r.appliances[0].metadata["power_zone_policy"] == "SAME_TALL_UNIT_LOWER_OR_UPPER_SECTION_OUTSIDE_APPLIANCE_BODY"
