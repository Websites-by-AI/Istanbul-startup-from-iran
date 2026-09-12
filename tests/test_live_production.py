"""Live production checks (network) — opt-in, so the default suite stays offline.

    RUN_LIVE=1 python3 -m pytest tests/test_live_production.py -q

Runs `node scripts/production_check.mjs`, which exercises both live hosts:
  * Cloudflare Pages  https://istanbul-startup-from-iran.pages.dev   (site + edge API + webhooks)
  * GitHub Pages      https://websites-by-ai.github.io/Istanbul-startup-from-iran/  (static mirror)
"""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "scripts" / "production_check.mjs"

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_LIVE") != "1" or shutil.which("node") is None,
    reason="set RUN_LIVE=1 (and have node installed) to hit the live deployments",
)


def test_live_deployments_pass_every_check() -> None:
    proc = subprocess.run(
        ["node", str(SCRIPT)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=300,
    )
    out = proc.stdout + proc.stderr
    assert proc.returncode == 0, out
    assert "0 failed" in out, out
    # both hosts must have been exercised
    assert "Cloudflare Pages" in out and "GitHub Pages mirror" in out


def test_every_individual_check_passed() -> None:
    proc = subprocess.run(["node", str(SCRIPT)], cwd=ROOT, capture_output=True, text=True, timeout=300)
    lines = [ln for ln in proc.stdout.splitlines() if ln.strip().startswith(("PASS", "FAIL"))]
    assert lines, proc.stdout
    failures = [ln for ln in lines if ln.strip().startswith("FAIL")]
    assert not failures, "\n".join(failures)
    assert len(lines) >= 25, f"expected >=25 checks, got {len(lines)}"
