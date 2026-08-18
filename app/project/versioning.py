from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.engine.constants import RULE_SET_VERSION

PROJECT_FORMAT_VERSION = "1.1.0"


class ProjectMigrationError(ValueError):
    pass


def migrate(project: dict[str, Any], from_version: str, to_version: str) -> dict[str, Any]:
    """Versioned project migration interface.

    Build 1.1-A intentionally implements only a minimal mock migration path.
    Future migrations must be explicit and regression-tested.
    """
    if from_version == to_version:
        return deepcopy(project)

    if from_version == "1.1.0-alpha" and to_version == PROJECT_FORMAT_VERSION:
        migrated = deepcopy(project)
        identity = migrated.setdefault("identity", {})
        identity["project_format_version"] = PROJECT_FORMAT_VERSION
        return migrated

    raise ProjectMigrationError(f"No migration path registered: {from_version} -> {to_version}")
