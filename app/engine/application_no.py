from datetime import datetime
from threading import Lock

_lock = Lock()
_counters: dict[str, int] = {}


def next_application_no(now: datetime | None = None) -> str:
    now = now or datetime.now()
    key = now.strftime("%Y-%m")
    with _lock:
        _counters[key] = _counters.get(key, 0) + 1
        seq = _counters[key]
    return f"{seq}.{now:%m.%y}"


def next_order_no(now: datetime | None = None) -> str:
    """BIZET OS 1.1 terminology alias. Legacy next_application_no remains supported."""
    return next_application_no(now)
