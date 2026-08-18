from __future__ import annotations

import json

from .models import ProjectState
from .versioning import PROJECT_FORMAT_VERSION, migrate


def export_project_state(project: ProjectState) -> str:
    return project.model_dump_json(indent=2)


def import_project_state(payload: str | bytes | dict) -> ProjectState:
    if isinstance(payload, (str, bytes)):
        raw = json.loads(payload)
    else:
        raw = payload
    version = raw.get("identity", {}).get("project_format_version", PROJECT_FORMAT_VERSION)
    if version != PROJECT_FORMAT_VERSION:
        raw = migrate(raw, version, PROJECT_FORMAT_VERSION)
    return ProjectState.model_validate(raw)
