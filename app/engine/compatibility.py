from __future__ import annotations

from app.domain.enums import ApplianceType, CooktopEnergyType, EngineResultType, OpeningSystem
from app.domain.models import CompatibilityResponse, EngineResult, ProjectInput, RuleTrace
from . import constants as C
from .appliances import ApplianceResolver


class CompatibilityEngine:
    @staticmethod
    def _result(rule_id, typ, message, appliance=None, blocking=False, data=None):
        return EngineResult(rule_id=rule_id,result_type=typ,message=message,appliance_type=appliance,blocking=blocking,data=data or {})

    @classmethod
    def evaluate(cls, project: ProjectInput) -> CompatibilityResponse:
        results=[]; traces=[]
        resolved=ApplianceResolver.resolve(project)
        results.extend(resolved.results); traces.extend(resolved.rule_trace)
        confirmed_by_type={}
        for c in project.communications:
            if c.confirmed:
                confirmed_by_type.setdefault(c.type, []).append(c)

        if project.object_type.value == "COMMERCIAL_PLACEHOLDER":
            results.append(cls._result("SCOPE-COMM-01",EngineResultType.STOP,"Commercial object is a placeholder in BIZET OS 1.0",blocking=True))

        # Required connection presence. Exact outlet geometry relative to appliance is validated later when a placed 3D envelope exists.
        for original, resolved_item in zip(project.appliances, resolved.appliances):
            for required in resolved_item.required_connections:
                if required not in confirmed_by_type:
                    results.append(cls._result("COMM-REQUIRED-01",EngineResultType.STOP,
                        f"Missing confirmed {required} for {original.type.value}", original.type, True, {"connection":required}))

            if original.type == ApplianceType.FRIDGE_BUILTIN and original.has_door_closer and project.opening_system == OpeningSystem.GOLA:
                results.append(cls._result("A-FRIDGE-BI-03",EngineResultType.HUMAN_REVIEW,
                    "Built-in fridge with door closers + horizontal GOLA requires specialist review; vertical GOLA is preferred fallback",
                    original.type, True, {"fallback":"VERTICAL_GOLA","partial_grip_mm":C.PARTIAL_GOLA_GRIP_REVIEW}))

            if original.type == ApplianceType.HOOD_BUILTIN and "VENT" in confirmed_by_type:
                # Specification says route itself is not automated in v1.0.
                results.append(cls._result("HOOD-BI-ROUTE-01",EngineResultType.HUMAN_REVIEW,
                    "Built-in hood ventilation route must be checked by a specialist in v1.0", original.type, True))

            if original.type == ApplianceType.COOKTOP and original.cooktop_energy in {CooktopEnergyType.GAS,CooktopEnergyType.COMBINED}:
                if "GAS" in confirmed_by_type:
                    results.append(cls._result("COMM-GAS-01",EngineResultType.HUMAN_REVIEW,
                        "Gas pipe routing that can affect furniture geometry requires specialist review in v1.0", original.type, True))

        # Dishwasher adjacency is a hard layout rule; actual adjacency is verified after placement by Final Validation.
        if any(a.type==ApplianceType.DISHWASHER for a in project.appliances):
            if not any(a.type==ApplianceType.SINK for a in project.appliances):
                results.append(cls._result("A-DW-SINK-01",EngineResultType.STOP,
                    "Dishwasher selected without sink; BIZET v1.0 cannot satisfy adjacency rule", ApplianceType.DISHWASHER, True))
            else:
                results.append(cls._result("A-DW-SINK-01",EngineResultType.HARD_RULE,
                    "Dishwasher must be placed directly next to sink where geometry allows", ApplianceType.DISHWASHER))

        # Existing explicit appliance power flag stays supported, but cannot downgrade missing physical communication.
        for a in project.appliances:
            if a.requires_power and not a.power_confirmed:
                results.append(cls._result("COMM-POWER-FLAG-01",EngineResultType.STOP,
                    f"Power confirmation flag is false for {a.type.value}", a.type, True))

        for r in results:
            traces.append(RuleTrace(rule_id=r.rule_id,classification=r.result_type.value,message=r.message,data=r.data))
        return CompatibilityResponse(
            results=results,
            hard_rules=[r for r in results if r.result_type==EngineResultType.HARD_RULE],
            stops=[r for r in results if r.result_type==EngineResultType.STOP],
            human_review=[r for r in results if r.result_type==EngineResultType.HUMAN_REVIEW],
            warnings=[r for r in results if r.result_type==EngineResultType.WARNING],
            rule_trace=traces,
        )
