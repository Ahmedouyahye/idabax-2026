"""JSON-safe serialization helpers.

json.dump writes NaN/Infinity as invalid JSON literals. These helpers
recursively convert non-finite floats (and numpy scalars) into None so every
JSON output consumed by the frontend stays strictly valid.
"""
from __future__ import annotations

import json
import math


def sanitize_value(v):
    if isinstance(v, float):
        return v if math.isfinite(v) else None
    if isinstance(v, (int, str, bool)) or v is None:
        return v
    try:
        import numpy as np
    except ImportError:
        return v
    if isinstance(v, np.generic):
        return sanitize_value(v.item())
    return v


def sanitize(obj):
    """Recursively convert non-JSON-safe values (NaN, Inf, numpy scalars) to None."""
    if isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [sanitize(v) for v in obj]
    return sanitize_value(obj)


def dump_json(path: str, obj, **kwargs) -> None:
    kwargs.setdefault("ensure_ascii", False)
    with open(path, "w") as fh:
        json.dump(sanitize(obj), fh, **kwargs)
