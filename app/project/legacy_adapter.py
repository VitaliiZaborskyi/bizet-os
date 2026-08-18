from __future__ import annotations

from app.domain.models import ProjectInput
from .models import ProjectState, StateSource


_SOURCE_MAP = {
    StateSource.SCAN_DETECTED: "SCAN_DETECTED",
    StateSource.USER_ENTERED: "USER_ENTERED",
    StateSource.USER_CONFIRMED: "USER_CONFIRMED",
    StateSource.ESTIMATED: "ESTIMATED",
    StateSource.SYSTEM_CALCULATED: "SYSTEM_CALCULATED",
    StateSource.IMPORTED: "IMPORTED",
}


class LegacyAdapterError(ValueError):
    pass


def project_state_to_legacy_input(project: ProjectState) -> ProjectInput:
    g = project.room.geometry
    if not g.wall_length or g.wall_length.value_mm is None:
        raise LegacyAdapterError("room.geometry.wall_length is required for legacy Rule Engine")
    if not g.room_height or g.room_height.value_mm is None:
        raise LegacyAdapterError("room.geometry.room_height is required for legacy Rule Engine")
    if not g.wall_depth or g.wall_depth.value_mm is None:
        raise LegacyAdapterError("room.geometry.wall_depth is required for legacy Rule Engine")
    if not project.room.configuration:
        raise LegacyAdapterError("room.configuration is required for legacy Rule Engine")
    if not project.context.object_type:
        raise LegacyAdapterError("context.object_type is required for legacy Rule Engine")
    if "system" not in project.preferences.opening_preferences:
        raise LegacyAdapterError("preferences.opening_preferences.system is required for legacy Rule Engine")
    if "type" not in project.room.ceiling:
        raise LegacyAdapterError("room.ceiling.type is required for legacy Rule Engine")

    def dim(v, default=None):
        if v is None or v.value_mm is None:
            return default
        return {"value_mm": v.value_mm, "source": _SOURCE_MAP[v.provenance.source]}

    left = project.room.walls.get("LEFT")
    right = project.room.walls.get("RIGHT")

    payload = {
        "application_no": project.identity.order_no,
        "object_type": project.context.object_type or "NEW_BUILD",
        "configuration": project.room.configuration,
        "opening_system": project.preferences.opening_preferences.get("system", "HANDLE"),
        "room": {
            "wall_length": dim(g.wall_length),
            "room_height": dim(g.room_height),
            "wall_depth": dim(g.wall_depth),
            "left_wall": {
                "depth_mm": left.depth.value_mm if left and left.depth and left.depth.value_mm is not None else 0,
                "deviation_mm": left.deviation.value_mm if left and left.deviation and left.deviation.value_mm is not None else 0,
                "is_deep_wall": bool(left.is_deep_wall) if left else False,
                "source": _SOURCE_MAP[left.depth.provenance.source] if left and left.depth else "ESTIMATED",
            },
            "right_wall": {
                "depth_mm": right.depth.value_mm if right and right.depth and right.depth.value_mm is not None else 0,
                "deviation_mm": right.deviation.value_mm if right and right.deviation and right.deviation.value_mm is not None else 0,
                "is_deep_wall": bool(right.is_deep_wall) if right else False,
                "source": _SOURCE_MAP[right.depth.provenance.source] if right and right.depth else "ESTIMATED",
            },
            "horizontal_deviation_mm": g.horizontal_deviation.value_mm if g.horizontal_deviation and g.horizontal_deviation.value_mm is not None else 0,
            "vertical_deviation_mm": g.vertical_deviation.value_mm if g.vertical_deviation and g.vertical_deviation.value_mm is not None else 0,
            "finished_floor": bool(project.room.finish_state.get("finished_floor", True)),
            "skirting_present": bool(project.room.finish_state.get("skirting_present", False)),
            "ceiling_type": project.room.ceiling.get("type", "OPEN_GAP"),
            "ceiling_gap_mm": int(project.room.ceiling.get("gap_mm", 100)),
            "obstacles": project.room.obstacles,
        },
        "communications": [
            {
                "id": c.id,
                "type": c.type,
                "x_mm": c.coordinates_mm[0] if c.coordinates_mm else 0,
                "y_mm": c.coordinates_mm[1] if c.coordinates_mm else 0,
                "z_mm": c.coordinates_mm[2] if c.coordinates_mm else 0,
                "tolerance_radius_mm": c.tolerance_radius_mm or 125,
                "source": _SOURCE_MAP[c.provenance.source],
                "confirmed": c.confirmation_state == "CONFIRMED" or c.provenance.confirmed,
                "notes": c.notes or "",
            }
            for c in project.communications
        ],
        "appliances": [
            {
                "type": a.type,
                "width_mm": a.dimensions_mm.get("width", a.dimensions_mm.get("width_mm")),
                "height_mm": a.dimensions_mm.get("height", a.dimensions_mm.get("height_mm")),
                "depth_mm": a.dimensions_mm.get("depth", a.dimensions_mm.get("depth_mm")),
                "side": a.configuration.get("side", "AUTO"),
                "built_in": a.configuration.get("built_in", a.installation_type == "BUILT_IN"),
                "has_door_closer": a.configuration.get("has_door_closer", False),
                "placement": a.configuration.get("placement", "AUTO"),
                "cooktop_energy": a.configuration.get("cooktop_energy", "UNKNOWN"),
                "sink_mount": a.configuration.get("sink_mount", "UNKNOWN"),
                "requires_power": a.configuration.get("requires_power", False),
                "power_confirmed": a.configuration.get("power_confirmed", True),
            }
            for a in project.appliances
        ],
        "preferences": {
            "budget_priority": project.preferences.budget.get("priority", True),
            "users_count": project.preferences.users or 2,
            "cutlery_tray": project.preferences.opening_preferences.get("cutlery_tray", True),
            "comfort_mode": project.preferences.opening_preferences.get("comfort_mode", False),
            "mezzanine": project.preferences.opening_preferences.get("mezzanine", False),
        },
    }
    return ProjectInput.model_validate(payload)
