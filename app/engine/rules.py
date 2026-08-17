from __future__ import annotations

from dataclasses import dataclass

from app.domain.enums import (
    ApplianceType,
    Configuration,
    ModuleKind,
    OpeningSystem,
    ValidationStatus,
)
from app.domain.models import (
    ApplianceInput,
    LayoutCandidate,
    LayoutItem,
    ProjectInput,
    RuleTrace,
    ValidationResult,
)
from . import constants as C
from .room import RoomEngine
from .compatibility import CompatibilityEngine
from .appliances import ApplianceResolver
from .module_engine import ModuleEngine
from .ranking import RankingEngine


@dataclass
class ReservedEdge:
    side: str
    width_mm: int
    filler_type: str
    reason: str


class FillerEngine:
    @staticmethod
    def _edge(project: ProjectInput, side: str) -> ReservedEdge | None:
        config = project.configuration
        has_wall = (
            (side == "LEFT" and config in {Configuration.LEFT_WALL, Configuration.BETWEEN_WALLS})
            or (side == "RIGHT" and config in {Configuration.RIGHT_WALL, Configuration.BETWEEN_WALLS})
        )
        if not has_wall:
            return None

        wall = project.room.left_wall if side == "LEFT" else project.room.right_wall
        if wall.deviation_mm > C.WALL_DEVIATION_SCRIBE_MAX:
            return ReservedEdge(side, C.FILLER_COMPENSATION, "L_SHAPED_REVIEW", "wall deviation > pilot threshold")

        # Handles against a wall can hit the wall / restrict opening: use L-shaped filler.
        if project.opening_system == OpeningSystem.HANDLE:
            return ReservedEdge(side, C.FILLER_COMPENSATION, "L_SHAPED", "handle/facade opening clearance")

        if wall.deviation_mm > 0:
            return ReservedEdge(side, C.FILLER_COMPENSATION, "SCRIBE", "wall deviation compensation")

        return ReservedEdge(side, C.FILLER_END, "END_18", "straight wall, opening clear")

    @classmethod
    def resolve(cls, project: ProjectInput) -> tuple[list[ReservedEdge], list[RuleTrace], list[str]]:
        edges: list[ReservedEdge] = []
        traces: list[RuleTrace] = []
        review: list[str] = []
        for side in ("LEFT", "RIGHT"):
            edge = cls._edge(project, side)
            if not edge:
                continue
            edges.append(edge)
            traces.append(RuleTrace(
                rule_id="FILLER-EDGE-01",
                classification="DEFAULT RULE" if "REVIEW" not in edge.filler_type else "HUMAN REVIEW REQUIRED",
                message=f"{side}: reserve {edge.width_mm} mm filler ({edge.filler_type})",
                data={"side": side, "width_mm": edge.width_mm, "reason": edge.reason},
            ))
            wall = project.room.left_wall if side == "LEFT" else project.room.right_wall
            if wall.deviation_mm > C.WALL_DEVIATION_SCRIBE_MAX:
                review.append(f"{side}: wall deviation {wall.deviation_mm} mm exceeds {C.WALL_DEVIATION_SCRIBE_MAX} mm")
        return edges, traces, review


class ApplianceEngine:
    """Places edge/tall units and the wet zone.

    The cooktop is intentionally deferred until Module Engine assembly so residual
    work-surface modules can be inserted between wet zone and cooking zone.
    """

    @staticmethod
    def _get(project: ProjectInput, typ: ApplianceType) -> list[ApplianceInput]:
        return [a for a in project.appliances if a.type == typ]

    @classmethod
    def place(cls, project: ProjectInput, start_x: int, end_x: int) -> tuple[list[LayoutItem], list[RuleTrace], int]:
        items: list[LayoutItem] = []
        traces: list[RuleTrace] = []
        left_cursor = start_x
        right_cursor = end_x

        fridges = cls._get(project, ApplianceType.FRIDGE_BUILTIN) + cls._get(project, ApplianceType.FRIDGE_FREESTANDING)
        for idx, fridge in enumerate(fridges):
            side = fridge.side
            if side == "AUTO":
                side = "LEFT" if project.configuration != Configuration.RIGHT_WALL else "RIGHT"
            width = fridge.width_mm
            if side == "LEFT":
                items.append(LayoutItem(
                    id=f"fridge-{idx}", label="Холодильник", kind=ModuleKind.TALL,
                    width_mm=width, x_mm=left_cursor, standard_width=(width % C.MODULE_GRID_STEP == 0),
                    appliance_type=fridge.type, side="LEFT"
                ))
                left_cursor += width
            else:
                right_cursor -= width
                items.append(LayoutItem(
                    id=f"fridge-{idx}", label="Холодильник", kind=ModuleKind.TALL,
                    width_mm=width, x_mm=right_cursor, standard_width=(width % C.MODULE_GRID_STEP == 0),
                    appliance_type=fridge.type, side="RIGHT"
                ))
            traces.append(RuleTrace(
                rule_id="APPL-FRIDGE-EDGE-01", classification="DEFAULT RULE",
                message=f"Fridge placed at {side.lower()} edge", data={"width_mm": width}
            ))

        occupied_left = max([i.x_mm + i.width_mm for i in items if i.side == "LEFT"], default=left_cursor)
        occupied_right = min([i.x_mm for i in items if i.side == "RIGHT"], default=right_cursor)
        cursor = occupied_left

        sinks = cls._get(project, ApplianceType.SINK)
        dishwashers = cls._get(project, ApplianceType.DISHWASHER)
        cooktops = cls._get(project, ApplianceType.COOKTOP)

        if sinks:
            sink = sinks[0]
            items.append(LayoutItem(
                id="sink-0", label="Мойка", kind=ModuleKind.APPLIANCE,
                width_mm=sink.width_mm, x_mm=cursor, standard_width=(sink.width_mm % 50 == 0),
                appliance_type=sink.type
            ))
            cursor += sink.width_mm
            if dishwashers:
                dw = dishwashers[0]
                items.append(LayoutItem(
                    id="dw-0", label="ПММ", kind=ModuleKind.APPLIANCE,
                    width_mm=dw.width_mm, x_mm=cursor, standard_width=(dw.width_mm % 50 == 0),
                    appliance_type=dw.type
                ))
                cursor += dw.width_mm
                traces.append(RuleTrace(
                    rule_id="A-DW-SINK-01", classification="HARD RULE",
                    message="Dishwasher placed directly next to sink where geometry allows"
                ))

        cook_width = cooktops[0].width_mm if cooktops else 0
        if cursor + cook_width > occupied_right:
            traces.append(RuleTrace(
                rule_id="APPL-COLLISION-01", classification="STOP",
                message="Fixed appliances exceed available horizontal span",
                data={"wet_zone_end": cursor, "cook_width": cook_width, "available_end": occupied_right},
            ))
        return sorted(items, key=lambda x: x.x_mm), traces, cook_width


class FinalValidationEngine:
    @staticmethod
    def validate(project: ProjectInput, items: list[LayoutItem], room_length: int, global_review: list[str], global_warnings: list[str], global_stops: list[str]) -> ValidationResult:
        checks: list[str] = []
        stops: list[str] = list(global_stops)
        warnings = list(global_warnings)
        review = list(global_review)

        used = sum(i.width_mm for i in items)
        checks.append(f"Length arithmetic: {used} / {room_length} mm")
        if used != room_length:
            stops.append(f"Layout length mismatch: used {used} mm, room {room_length} mm")

        # Horizontal collision check.
        ordered = sorted(items, key=lambda i: i.x_mm)
        collision_found = False
        for prev, cur in zip(ordered, ordered[1:]):
            if prev.x_mm + prev.width_mm > cur.x_mm:
                collision_found = True
                stops.append(f"Collision between {prev.label} and {cur.label}")
        if not collision_found:
            checks.append("No horizontal module collisions")

        # Dishwasher adjacency is a hard BIZET layout rule and must be verified after placement.
        sink_items = [i for i in ordered if i.appliance_type == ApplianceType.SINK]
        dw_items = [i for i in ordered if i.appliance_type == ApplianceType.DISHWASHER]
        if dw_items and sink_items:
            sink = sink_items[0]; dw = dw_items[0]
            adjacent = (sink.x_mm + sink.width_mm == dw.x_mm) or (dw.x_mm + dw.width_mm == sink.x_mm)
            if adjacent:
                checks.append("Dishwasher is directly adjacent to sink")
            else:
                stops.append("Dishwasher is not directly adjacent to sink")

        selected_types = {a.type for a in project.appliances}
        present_types = {i.appliance_type for i in items if i.appliance_type}
        for typ in selected_types:
            if typ in {ApplianceType.OVEN, ApplianceType.DISHWASHER, ApplianceType.SINK, ApplianceType.COOKTOP,
                       ApplianceType.FRIDGE_BUILTIN, ApplianceType.FRIDGE_FREESTANDING} and typ not in present_types:
                # Oven can be represented inside cooktop block in pilot.
                if typ == ApplianceType.OVEN and any(i.metadata.get("contains_oven") for i in items):
                    continue
                stops.append(f"Selected appliance missing from layout: {typ.value}")
        if not any(msg.startswith("Selected appliance missing") for msg in stops):
            checks.append("All pilot-scope selected appliances are represented in layout")

        # Technical de-duplication only: multiple engines may surface the same confirmed issue.
        warnings = list(dict.fromkeys(warnings))
        review = list(dict.fromkeys(review))
        stops = list(dict.fromkeys(stops))
        checks = list(dict.fromkeys(checks))

        if stops:
            status = ValidationStatus.STOP
        elif review:
            status = ValidationStatus.HUMAN_REVIEW
        elif warnings:
            status = ValidationStatus.VALID_WITH_WARNINGS
        else:
            status = ValidationStatus.VALID
        return ValidationResult(status=status, warnings=warnings, human_review=review, stops=stops, checks=checks)


class DecisionEngine:
    @staticmethod
    def generate(project: ProjectInput) -> list[LayoutCandidate]:
        resolved_room = RoomEngine.resolve(project)
        room_length = resolved_room.wall_length_mm
        edges, filler_traces, filler_review = FillerEngine.resolve(project)
        compat = CompatibilityEngine.evaluate(project)
        base_warnings = list(resolved_room.warnings) + [r.message for r in compat.warnings]
        base_review = list(resolved_room.human_review) + filler_review + [r.message for r in compat.human_review]
        compat_stops = [r.message for r in compat.stops]
        compat_traces = compat.rule_trace

        left_fill = next((e.width_mm for e in edges if e.side == "LEFT"), 0)
        right_fill = next((e.width_mm for e in edges if e.side == "RIGHT"), 0)
        fixed, appliance_traces, cook_width = ApplianceEngine.place(project, left_fill, room_length - right_fill)

        fixed_width = sum(i.width_mm for i in fixed)
        available_for_modules = room_length - left_fill - right_fill - fixed_width - cook_width
        base_traces = resolved_room.rule_trace + filler_traces + compat_traces + appliance_traces

        required = ModuleEngine.required_functions(project.preferences, available_for_modules)
        required_review = list(base_review)
        if not required.satisfied:
            required_review.extend(required.messages)

        residual = available_for_modules - required.width_mm if required.satisfied else available_for_modules
        splits = ModuleEngine.generate_splits(residual)
        if available_for_modules < 0:
            splits = []

        # If overconstrained, create one explicit invalid candidate so the UI can explain why.
        if not splits:
            splits = [None]

        candidates: list[LayoutCandidate] = []
        for idx, split in enumerate(splits[: C.MODULE_MAX_CANDIDATES]):
            traces = list(base_traces)
            items: list[LayoutItem] = []

            if left_fill:
                edge = next(e for e in edges if e.side == "LEFT")
                items.append(LayoutItem(
                    id="filler-left", label=f"Филлер {left_fill}", kind=ModuleKind.FILLER,
                    width_mm=left_fill, x_mm=0, standard_width=False, side="LEFT",
                    metadata={"filler_type": edge.filler_type},
                ))
            if right_fill:
                edge = next(e for e in edges if e.side == "RIGHT")
                items.append(LayoutItem(
                    id="filler-right", label=f"Филлер {right_fill}", kind=ModuleKind.FILLER,
                    width_mm=right_fill, x_mm=room_length-right_fill, standard_width=False, side="RIGHT",
                    metadata={"filler_type": edge.filler_type},
                ))

            items.extend(fixed)
            fixed_intervals = sorted((i.x_mm, i.x_mm + i.width_mm) for i in fixed)
            start = left_fill
            for a, b in fixed_intervals:
                if a <= start <= b:
                    start = b
            cursor = start

            required_satisfied = required.satisfied
            if required.satisfied:
                for rid, width, kind, opening in required.items:
                    items.append(LayoutItem(
                        id=f"{rid}-0", label="Ящики / лоток", kind=kind,
                        width_mm=width, x_mm=cursor,
                        standard_width=(width % C.MODULE_GRID_STEP == 0), opening=opening,
                        metadata={"pilot_constant": True, "required_function": "CUTLERY_TRAY"},
                    ))
                    cursor += width
                if required.items:
                    traces.append(RuleTrace(
                        rule_id="MOD-FUNC-CUTLERY-01", classification="DEFAULT RULE",
                        message=f"Required cutlery function reserved first: {required.width_mm} mm (pilot OQ-01 value)",
                    ))
            else:
                traces.append(RuleTrace(
                    rule_id="MOD-FUNC-CUTLERY-01", classification="HUMAN REVIEW REQUIRED",
                    message="Required cutlery function cannot be allocated with current available width.",
                    data={"messages": list(required.messages)},
                ))

            local_warnings = list(base_warnings)
            if split is not None:
                hinged_items, module_traces = ModuleEngine.instantiate_hinged(split, cursor, idx)
                items.extend(hinged_items)
                traces.extend(module_traces)
                cursor += sum(split.widths)
                if split.nonstandard_count:
                    local_warnings.append("Nonstandard residual module: accessory compatibility required before detailed design")
            else:
                traces.append(RuleTrace(
                    rule_id="MOD-SPACE-STOP-01", classification="STOP",
                    message="No horizontal space remains for a valid residual split.",
                    data={"available_for_modules": available_for_modules},
                ))

            if cook_width:
                cook = next(a for a in project.appliances if a.type == ApplianceType.COOKTOP)
                has_oven = any(a.type == ApplianceType.OVEN for a in project.appliances)
                items.append(LayoutItem(
                    id="cook-0", label="Варочная + духовка" if has_oven else "Варочная", kind=ModuleKind.APPLIANCE,
                    width_mm=cook_width, x_mm=cursor, standard_width=(cook_width % C.MODULE_GRID_STEP == 0),
                    appliance_type=ApplianceType.COOKTOP, metadata={"contains_oven": has_oven},
                ))
                traces.append(RuleTrace(
                    rule_id="FUNC-WET-PREP-COOK-01", classification="DEFAULT RULE",
                    message="Residual work-surface modules are placed before cooktop; wet zone remains upstream.",
                ))
                cursor += cook_width

            validation_stops = list(compat_stops)
            if available_for_modules < 0:
                validation_stops.append(
                    f"Fixed equipment, fillers and cooktop exceed room length by {-available_for_modules} mm"
                )

            validation = FinalValidationEngine.validate(
                project, items, room_length, required_review, local_warnings, validation_stops
            )
            used = sum(i.width_mm for i in items)
            breakdown = RankingEngine.breakdown(
                items=items, validation=validation, project=project,
                required_function_satisfied=required_satisfied,
                room_length_mm=room_length, used_length_mm=used,
            )
            candidates.append(LayoutCandidate(
                candidate_id=f"C{idx+1}",
                items=sorted(items, key=lambda i: i.x_mm),
                used_length_mm=used,
                room_length_mm=room_length,
                residual_mm=room_length-used,
                score=RankingEngine.display_score(breakdown),
                score_breakdown=breakdown,
                applied_rules=traces,
                validation=validation,
            ))

        # True lexicographic ranking. Scalar score is UI/debug only.
        candidates.sort(key=RankingEngine.key, reverse=True)
        for rank, c in enumerate(candidates, start=1):
            c.candidate_id = f"C{rank}"
        return candidates

