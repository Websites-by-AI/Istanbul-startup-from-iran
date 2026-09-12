"""The Cloudflare Pages deployment runs a JavaScript port of the core.

These tests keep the two implementations in sync:

1. `scripts/parity_check.mjs` exercises the JS core directly (node).
2. The Python checks below assert the *same* expectations against the Python
   core, so a change to either side that breaks parity fails the suite.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
NODE = shutil.which("node")

PARITY_CASES = [
    ("/legal", {"route": "legal_desk", "escalated": True, "contains": ["LEGAL DESK", "not legal advice"]}),
    (
        "can you guarantee kimlik and residence permit for my team?",
        {"route": "residence", "escalated": True, "refusal": True, "contains": ["[outcome not guaranteed]"]},
    ),
    ("/journey", {"route": "journey", "contains": ["No guaranteed immigration result is promised.", "STEP 6"]}),
    (
        "سلام، برای ثبت شرکت در ترکیه و گرفتن اقامت چه کار کنم؟",
        {"route": "company_formation", "language": "fa", "escalated": True},
    ),
    (
        "merhaba, Türkiye'de şirket kurmak ve çalışma izni için hangi yol izlenmeli?",
        {"language": "tr", "escalated": True},
    ),
    ("/hotels Istanbul", {"route": "hotels", "contains": ["Total sponsored room nights available: 15"]}),
    ("/corporate", {"route": "corporate", "contains": ["CORPORATE STARTUP SPONSORSHIP FLOW"]}),
    ("/pilot 500", {"route": "pilot", "contains": ["projected for 500"]}),
    ("/metrics", {"route": "metrics", "contains": ["SUCCESS METRICS"]}),
    ("/lang fa", {"route": "lang"}),
    ("/human", {"route": "human", "escalated": True}),
]


@pytest.mark.skipif(NODE is None, reason="node is not installed")
def test_js_core_parity_script_passes():
    result = subprocess.run(
        [NODE, str(ROOT / "scripts" / "parity_check.mjs")],
        cwd=ROOT, capture_output=True, text=True, timeout=120,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "FAIL" not in result.stdout
    last = [l for l in result.stdout.splitlines() if "parity checks passed" in l]
    assert last, result.stdout


@pytest.mark.parametrize("text,expected", PARITY_CASES)
def test_python_core_matches_the_js_expectations(sim, text, expected):
    r = sim.say(text, chat_id="parity")
    if "route" in expected:
        assert r.route == expected["route"], f"{text!r} → {r.route}"
    if "language" in expected:
        assert r.language == expected["language"]
    if expected.get("escalated"):
        assert r.escalated is True
    if expected.get("refusal"):
        assert r.meta["safety"]["refusal"] is True
    for needle in expected.get("contains", []):
        assert needle in r.text, f"missing {needle!r}"


def test_js_seed_data_matches_python_seed_data():
    """functions/_core/data.js is generated from data/hotels.json — keep it honest."""
    data_js = ROOT / "functions" / "_core" / "data.js"
    if not data_js.exists():
        pytest.skip("run `python3 build_static.py` first")
    payload = data_js.read_text(encoding="utf-8")
    payload = payload[payload.index("{") : payload.rindex("}") + 1]
    js_data = json.loads(payload)
    py_data = json.loads((ROOT / "data" / "hotels.json").read_text(encoding="utf-8"))
    assert js_data == py_data


def test_js_intake_form_matches_python():
    from bot import legal_desk

    core_js = (ROOT / "functions" / "_core" / "legal_desk.js").read_text(encoding="utf-8")
    for key in legal_desk.REQUIRED_INTAKE_KEYS:
        assert f'key: "{key}"' in core_js, f"{key} missing from the JS intake form"
    for step in legal_desk.JOURNEY:
        assert f'title: "{step["title"]}"' in core_js, f'journey step {step["step"]} missing from JS'
