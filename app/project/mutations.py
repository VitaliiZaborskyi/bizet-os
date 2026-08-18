from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from .dependencies import DependencyEngine, default_dependency_engine
from .models import ChangeCommand, MeasuredValue, MutationResult, ProjectState, Provenance


class MutationError(ValueError):
    pass


def _get_child(obj: Any, key: str) -> Any:
    if hasattr(obj, key):
        return getattr(obj, key)
    if isinstance(obj, dict):
        return obj[key]
    raise MutationError(f"Unknown mutation path segment: {key}")


def _set_child(obj: Any, key: str, value: Any) -> None:
    if hasattr(obj, key):
        current = getattr(obj, key)
        if isinstance(current, MeasuredValue) or key in {"wall_length", "room_height", "wall_depth", "horizontal_deviation", "vertical_deviation"}:
            if isinstance(value, dict) and "value_mm" in value:
                setattr(obj, key, MeasuredValue.model_validate(value))
            elif isinstance(value, int):
                old_prov = current.provenance if isinstance(current, MeasuredValue) else None
                provenance = old_prov or Provenance(source="USER_ENTERED")
                setattr(obj, key, MeasuredValue(value_mm=value, provenance=provenance))
            else:
                setattr(obj, key, value)
        else:
            setattr(obj, key, value)
        return
    if isinstance(obj, dict):
        obj[key] = value
        return
    raise MutationError(f"Cannot set mutation path segment: {key}")


def _clear_path(project: ProjectState, path: str) -> None:
    # In Build 1.1-A only fields whose stale value could be falsely treated as current
    # are physically cleared. Lists/candidate payloads are otherwise retained and marked stale.
    if path == "furniture.selected_candidate":
        project.furniture.selected_candidate = None
    elif path == "validation":
        project.validation.client_messages = []


class ProjectMutationService:
    def __init__(self, dependency_engine: DependencyEngine | None = None) -> None:
        self.dependencies = dependency_engine or default_dependency_engine()

    def apply(self, project: ProjectState, command: ChangeCommand) -> MutationResult:
        updated = project.model_copy(deep=True)
        parts = command.path.split(".")
        target: Any = updated
        for segment in parts[:-1]:
            target = _get_child(target, segment)

        old_value = deepcopy(_get_child(target, parts[-1]) if hasattr(target, parts[-1]) or isinstance(target, dict) and parts[-1] in target else None)

        value = command.value
        current = old_value
        if isinstance(current, MeasuredValue) and not isinstance(value, MeasuredValue):
            provenance = Provenance(
                source=command.source or current.provenance.source,
                confidence=command.confidence if command.confidence is not None else current.provenance.confidence,
                confirmed=command.confirmed if command.confirmed is not None else current.provenance.confirmed,
            )
            value = MeasuredValue(value_mm=int(value), provenance=provenance)
        elif command.source is not None and parts[-1] in {"wall_length", "room_height", "wall_depth", "horizontal_deviation", "vertical_deviation"}:
            value = MeasuredValue(
                value_mm=int(command.value),
                provenance=Provenance(
                    source=command.source,
                    confidence=command.confidence,
                    confirmed=bool(command.confirmed),
                ),
            )

        _set_child(target, parts[-1], value)

        impact = self.dependencies.resolve(command.path)
        for path in impact["affected"]:
            _clear_path(updated, path)

        updated.dependencies.stale_paths = sorted(set(updated.dependencies.stale_paths + impact["affected"]))
        updated.dependencies.recalculation_required = sorted(set(updated.dependencies.recalculation_required + impact["recalculate"]))
        updated.dependencies.reconfirmation_required = sorted(set(updated.dependencies.reconfirmation_required + impact["reconfirm"]))
        updated.identity.updated_at = datetime.now(timezone.utc)

        trace = {
            "timestamp": updated.identity.updated_at.isoformat(),
            "path": command.path,
            "old_value": old_value.model_dump(mode="json") if hasattr(old_value, "model_dump") else old_value,
            "new_value": value.model_dump(mode="json") if hasattr(value, "model_dump") else value,
            "reason": command.reason,
            "affected": impact["affected"],
        }
        updated.trace.significant_changes.append(trace)

        return MutationResult(
            project=updated,
            affected_dependencies=impact["affected"],
            invalidated_values=impact["affected"],
            required_recalculations=impact["recalculate"],
            required_reconfirmations=impact["reconfirm"],
            change_trace=trace,
        )
