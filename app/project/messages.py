from __future__ import annotations

from typing import Any


def engine_result_to_client_message(result: Any) -> dict[str, Any]:
    """Build 1.1-A mapping placeholder.

    Intentionally does not author final UX copy. It hides engine vocabulary while
    preserving a stable mapping contract for Build 1.1-B and later UI work.
    """
    raw_type = getattr(getattr(result, "result_type", None), "value", None) or str(getattr(result, "result_type", "INFO"))
    blocking = bool(getattr(result, "blocking", False))
    if blocking or raw_type in {"STOP", "HUMAN_REVIEW"}:
        category = "ACTION_REQUIRED"
    elif raw_type in {"WARNING", "USER_CHOICE_REQUIRED"}:
        category = "ATTENTION"
    else:
        category = "INFO"
    return {
        "category": category,
        "message": getattr(result, "message", ""),
        "can_continue": not blocking,
    }
