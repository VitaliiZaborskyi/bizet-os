from __future__ import annotations

from app.domain.enums import AppliancePlacement, ApplianceType, CooktopEnergyType, EngineResultType
from app.domain.models import ApplianceResolveResponse, ApplianceResolvedItem, EngineResult, ProjectInput, RuleTrace
from . import constants as C


POWER_APPLIANCES = {
    ApplianceType.FRIDGE_BUILTIN, ApplianceType.FRIDGE_FREESTANDING, ApplianceType.FREEZER,
    ApplianceType.DISHWASHER, ApplianceType.COOKTOP, ApplianceType.OVEN,
    ApplianceType.MICROWAVE, ApplianceType.HOOD_FREESTANDING, ApplianceType.HOOD_BUILTIN,
    ApplianceType.WASTE_DISPOSER,
}


class ApplianceResolver:
    @staticmethod
    def required_connections(appliance):
        if appliance.type == ApplianceType.COOKTOP:
            if appliance.cooktop_energy in {CooktopEnergyType.GAS, CooktopEnergyType.COMBINED}:
                return ["GAS"] + (["COOKTOP_POWER"] if appliance.cooktop_energy == CooktopEnergyType.COMBINED else [])
            return ["COOKTOP_POWER"]
        if appliance.type == ApplianceType.HOOD_BUILTIN:
            return ["APPLIANCE_POWER", "VENT"]
        if appliance.type == ApplianceType.HOOD_FREESTANDING:
            return ["APPLIANCE_POWER"]
        if appliance.type == ApplianceType.SINK:
            return ["DRAIN", "WATER"]
        if appliance.type == ApplianceType.DISHWASHER:
            return ["APPLIANCE_POWER", "DRAIN", "WATER"]
        if appliance.type in POWER_APPLIANCES:
            return ["APPLIANCE_POWER"]
        return []

    @classmethod
    def resolve(cls, project: ProjectInput) -> ApplianceResolveResponse:
        items=[]; results=[]; traces=[]
        for a in project.appliances:
            required=cls.required_connections(a)
            metadata={}
            if a.type == ApplianceType.FRIDGE_BUILTIN:
                metadata.update({
                    "create_tall_unit": True,
                    "ventilation_required": True,
                    "lower_vent_grille": True,
                    "bottom_air_opening": True,
                    "rear_convection_channel": True,
                    "align_lower_front_line": True,
                })
                results.append(EngineResult(rule_id="A-FRIDGE-BI-02", result_type=EngineResultType.HARD_RULE,
                    message="Built-in fridge requires lower air intake, plinth grille, bottom opening and rear convection channel",
                    appliance_type=a.type, blocking=False))
                results.append(EngineResult(rule_id="A-FRIDGE-BI-07", result_type=EngineResultType.DEFAULT_RULE,
                    message="Built-in fridge automatically creates a tall unit", appliance_type=a.type))
            elif a.type == ApplianceType.FRIDGE_FREESTANDING:
                metadata.update({"furniture_front_alignment": False, "side_filler_mm": C.FREESTANDING_FRIDGE_L_FILLER,
                                 "overhead_gap_mm": C.FRIDGE_TOP_GAP_WITH_OVERHEAD})
                results.append(EngineResult(rule_id="A-FRIDGE-FS-01", result_type=EngineResultType.DEFAULT_RULE,
                    message=f"Freestanding fridge uses {C.FREESTANDING_FRIDGE_L_FILLER} mm L-shaped side filler when adjacent to wall", appliance_type=a.type))
            elif a.type == ApplianceType.HOOD_BUILTIN:
                metadata["upper_carcass_depth_mm"] = C.UPPER_CARCASS_DEPTH_BUILTIN_HOOD
                results.append(EngineResult(rule_id="HOOD-BI-DEPTH-01", result_type=EngineResultType.DEFAULT_RULE,
                    message=f"Built-in hood changes upper carcass depth to {C.UPPER_CARCASS_DEPTH_BUILTIN_HOOD} mm", appliance_type=a.type))
            elif a.type == ApplianceType.OVEN and a.placement == AppliancePlacement.TALL_UNIT:
                metadata.update({"create_tall_unit": True, "bottom_functional_section_mm": C.TALL_OVEN_BOTTOM_DRAWER_DEFAULT})
                results.append(EngineResult(rule_id="A-OVEN-TALL-01", result_type=EngineResultType.HARD_RULE,
                    message="Oven in tall unit is not placed at floor level; lower functional section is preserved", appliance_type=a.type))
            elif a.type == ApplianceType.SINK:
                metadata["mount_type"] = a.sink_mount.value
            elif a.type == ApplianceType.WASTE_DISPOSER:
                metadata["reduces_sink_cabinet_usable_volume"] = True
                results.append(EngineResult(rule_id="A-DISPOSER-01", result_type=EngineResultType.HARD_RULE,
                    message="Waste disposer reduces usable volume in sink cabinet", appliance_type=a.type))

            # Connection placement policies are explicit BIZET rules. Exact xyz validation is deferred until the appliance envelope is placed.
            if a.type in {ApplianceType.OVEN, ApplianceType.MICROWAVE} and a.placement == AppliancePlacement.TALL_UNIT:
                metadata["power_zone_policy"] = "SAME_TALL_UNIT_LOWER_OR_UPPER_SECTION_OUTSIDE_APPLIANCE_BODY"
            elif a.type in {ApplianceType.FRIDGE_BUILTIN, ApplianceType.FRIDGE_FREESTANDING, ApplianceType.FREEZER}:
                metadata["power_zone_policy"] = "ABOVE_OR_BELOW_APPLIANCE_BODY"
            elif a.type in {ApplianceType.HOOD_BUILTIN, ApplianceType.HOOD_FREESTANDING}:
                metadata["power_zone_policy"] = "OFFSET_FROM_CENTER_WITHIN_HOOD_MODULE"
            elif "APPLIANCE_POWER" in required:
                metadata["power_zone_policy"] = "OUTSIDE_PHYSICAL_APPLIANCE_BODY"

            items.append(ApplianceResolvedItem(type=a.type,width_mm=a.width_mm,height_mm=a.height_mm,depth_mm=a.depth_mm,
                side=a.side,built_in=a.built_in,required_connections=required,metadata=metadata))
            traces.append(RuleTrace(rule_id="APPL-RESOLVE-01",classification="INPUT",message=f"Resolved {a.type.value}",
                data={"required_connections":required,"width_mm":a.width_mm}))
        return ApplianceResolveResponse(appliances=items,results=results,rule_trace=traces)
