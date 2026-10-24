"""R10.6.3 3D CORE PROTECTION: immutable verified R10.6.0 implementation.
This test is deliberately fail-closed. If owner approves changing the renderer
in a later protected stage, update the frozen baseline only with a separately
reviewed 3D-browser QA evidence and explicit owner sign-off.
"""
from pathlib import Path
import hashlib

ROOT=Path(__file__).resolve().parents[1]
FROZEN={
    "app/static/kitchen-webgl-r1050.js":"c2b119c769844c09637f196d47570dc5fcc20e8a",
    "app/static/pilot-3d.js":"384e3074711e23926193dd9b46fa9c941ec96b72",
    "app/static/model.js":"7355ffe800375d636994dbde66c0886d3e331a7b",
}

def test_frozen_core_sha_matches_owner_verified_1060():
    for name, expected in FROZEN.items():
        payload=(ROOT/name).read_bytes()
        actual=hashlib.sha1(f"blob {len(payload)}\0".encode()+payload).hexdigest()
        assert actual==expected, (
          f"3D CORE PROTECTION FAILED: {name} has changed from verified 10.6.0. "
          "STOP: do not merge/deploy without separately proving 3D in real browsers."
        )

def test_extension_assets_do_not_import_old_broken_renderer_revisions():
    html=(ROOT/"app/static/workspace-r8.html").read_text(encoding="utf-8")
    assert "room-r1061.js" not in html
    assert "r1061.css" not in html
    assert "r1062.css" not in html
    assert "r1063-safe-ui.css" in html
    assert "r1063-safe-ui.js" in html
