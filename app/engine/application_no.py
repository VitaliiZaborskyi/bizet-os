from datetime import datetime
from threading import Lock
import re

_lock = Lock()
_legacy_counters: dict[str, int] = {}
_order_counters: dict[str, int] = {}


def _clean_code(value: str, min_len: int, max_len: int, fallback: str) -> str:
    value = re.sub(r"[^A-Za-z]", "", (value or "").upper())
    if len(value) < min_len:
        return fallback
    return value[:max_len]


def next_application_no(now: datetime | None = None) -> str:
    """Legacy pilot sequence retained for old endpoints/tests."""
    now = now or datetime.now()
    key = now.strftime("%Y-%m")
    with _lock:
        _legacy_counters[key] = _legacy_counters.get(key, 0) + 1
        seq = _legacy_counters[key]
    return f"{seq}.{now:%m.%y}"


def next_order_no(
    country_code: str = "XX",
    city_code: str = "XXX",
    now: datetime | None = None,
) -> str:
    """R10.2 order identity: CC-CITY-YY.MM.NNN.

    Counter is global per calendar month in the pilot process. Location is encoded
    in the immutable order number but does not create a separate monthly counter.
    """
    now = now or datetime.now()
    country = _clean_code(country_code, 2, 3, "XX")
    city = _clean_code(city_code, 2, 3, "XXX")
    key = now.strftime("%Y-%m")
    with _lock:
        _order_counters[key] = _order_counters.get(key, 0) + 1
        seq = _order_counters[key]
    return f"{country}-{city}-{now:%y.%m}.{seq:03d}"
