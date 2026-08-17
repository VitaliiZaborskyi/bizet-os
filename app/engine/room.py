from __future__ import annotations

from app.domain.enums import ConfidenceSource, Configuration
from app.domain.models import ProjectInput, RoomResolved, RuleTrace
from . import constants as C


class RoomEngine:
    """Normalizes manual/scan room data before furniture rules are evaluated."""

    @staticmethod
    def resolve(project: ProjectInput) -> RoomResolved:
        room = project.room
        warnings: list[str] = []
        human_review: list[str] = []
        trace: list[RuleTrace] = []

        active_sides: list[str] = []
        if project.configuration in {Configuration.LEFT_WALL, Configuration.BETWEEN_WALLS}:
            active_sides.append("LEFT")
        if project.configuration in {Configuration.RIGHT_WALL, Configuration.BETWEEN_WALLS}:
            active_sides.append("RIGHT")

        trace.append(RuleTrace(
            rule_id="ROOM-CONFIG-01",
            classification="HARD RULE",
            message=f"Straight-kitchen configuration resolved: {project.configuration.value}",
            data={"active_wall_sides": active_sides},
        ))

        # Estimated critical dimensions are allowed in pilot but are always visible warnings.
        for label, dim in (
            ("wall length", room.wall_length),
            ("room height", room.room_height),
            ("wall depth", room.wall_depth),
        ):
            if dim.source == ConfidenceSource.ESTIMATED:
                warnings.append(f"{label} is estimated; confirm before production-grade validation")
                trace.append(RuleTrace(
                    rule_id="ROOM-CONFIDENCE-01", classification="WARNING",
                    message=f"Estimated critical room parameter: {label}",
                ))

        for side, wall in (("LEFT", room.left_wall), ("RIGHT", room.right_wall)):
            if side not in active_sides:
                continue
            if wall.deviation_mm > C.WALL_DEVIATION_SCRIBE_MAX:
                human_review.append(
                    f"{side}: wall deviation {wall.deviation_mm} mm exceeds {C.WALL_DEVIATION_SCRIBE_MAX} mm"
                )
            if wall.source == ConfidenceSource.ESTIMATED:
                warnings.append(f"{side}: wall condition is estimated")

        if room.horizontal_deviation_mm:
            trace.append(RuleTrace(
                rule_id="ROOM-LEVEL-H-01", classification="INPUT",
                message=f"Horizontal deviation captured: {room.horizontal_deviation_mm} mm",
            ))
        if room.vertical_deviation_mm:
            trace.append(RuleTrace(
                rule_id="ROOM-LEVEL-V-01", classification="INPUT",
                message=f"Vertical deviation captured: {room.vertical_deviation_mm} mm",
            ))

        if room.skirting_present:
            warnings.append("Existing skirting is present; wall approach must account for it")
        if not room.finished_floor:
            warnings.append("Finished floor is not confirmed; vertical geometry is provisional")

        for obstacle in room.obstacles:
            if obstacle.source == ConfidenceSource.ESTIMATED or not obstacle.confirmed:
                warnings.append(f"Obstacle {obstacle.type} ({obstacle.id}) requires confirmation")
            trace.append(RuleTrace(
                rule_id="ROOM-OBSTACLE-01", classification="INPUT",
                message=f"Obstacle registered: {obstacle.type}",
                data={"id": obstacle.id, "x_mm": obstacle.x_mm, "width_mm": obstacle.width_mm,
                      "depth_mm": obstacle.depth_mm, "height_mm": obstacle.height_mm},
            ))

        for point in project.communications:
            if point.source == ConfidenceSource.SCAN_DETECTED and not point.confirmed:
                warnings.append(f"{point.type}: scan-detected communication requires user confirmation")
            elif point.source == ConfidenceSource.ESTIMATED:
                warnings.append(f"{point.type}: communication position is estimated")
            trace.append(RuleTrace(
                rule_id="ROOM-COMM-INPUT-01", classification="INPUT",
                message=f"Communication registered: {point.type}",
                data={"x_mm": point.x_mm, "y_mm": point.y_mm, "z_mm": point.z_mm,
                      "source": point.source.value, "confirmed": point.confirmed,
                      "tolerance_radius_mm": point.tolerance_radius_mm},
            ))

        trace.append(RuleTrace(
            rule_id="ROOM-CEILING-01", classification="INPUT",
            message=f"Ceiling type: {room.ceiling_type.value}",
            data={"ceiling_gap_mm": room.ceiling_gap_mm},
        ))

        return RoomResolved(
            wall_length_mm=room.wall_length.value_mm,
            room_height_mm=room.room_height.value_mm,
            wall_depth_mm=room.wall_depth.value_mm,
            configuration=project.configuration,
            ceiling_type=room.ceiling_type,
            active_wall_sides=active_sides,
            obstacles=room.obstacles,
            communications=project.communications,
            warnings=warnings,
            human_review=human_review,
            rule_trace=trace,
        )
