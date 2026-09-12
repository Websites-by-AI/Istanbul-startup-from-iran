"""Persistent JSON store — leads, legal cases, sessions.

Deliberately dependency-free (stdlib only) so the bot runs anywhere. Swap
:class:`Store` for a Postgres/SQLite implementation later without touching
the module APIs.
"""

from __future__ import annotations

import json
import threading
import time
from pathlib import Path
from typing import Any

from .models import LegalCase, Startup


class Store:
    def __init__(self, directory: str | Path) -> None:
        self.dir = Path(directory)
        self.dir.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()

    # ---------- low level ----------
    def _path(self, name: str) -> Path:
        return self.dir / f"{name}.json"

    def load(self, name: str, default: Any) -> Any:
        p = self._path(name)
        if not p.exists():
            return default
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return default

    def save(self, name: str, value: Any) -> None:
        with self._lock:
            p = self._path(name)
            tmp = p.with_suffix(".tmp")
            tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
            tmp.replace(p)

    # ---------- sessions ----------
    def get_session(self, key: str) -> dict[str, Any]:
        sessions = self.load("sessions", {})
        return sessions.get(key) or {"key": key, "created_at": time.time(), "language": "en", "step": 0}

    def put_session(self, key: str, session: dict[str, Any]) -> None:
        with self._lock:
            sessions = self.load("sessions", {})
            session["updated_at"] = time.time()
            sessions[key] = session
            self.save("sessions", sessions)

    # ---------- startups / leads ----------
    def add_startup(self, startup: Startup) -> Startup:
        with self._lock:
            items = [Startup(**s) if isinstance(s, dict) else s for s in self.load("startups", [])]
            items = [s if isinstance(s, Startup) else Startup(**s) for s in items]
            items.append(startup)
            self.save("startups", [s.as_dict() for s in items])
        return startup

    def list_startups(self) -> list[Startup]:
        raw = self.load("startups", [])
        out: list[Startup] = []
        for item in raw:
            d = dict(item)
            d.pop("founders", None)
            out.append(Startup(**d))
        return out

    # ---------- legal cases ----------
    def add_case(self, case: LegalCase) -> LegalCase:
        with self._lock:
            cases = self.load("legal_cases", [])
            cases.append(case.__dict__)
            self.save("legal_cases", cases)
        return case

    def get_case(self, case_id: str) -> LegalCase | None:
        for c in self.load("legal_cases", []):
            if c.get("id") == case_id:
                return LegalCase(**c)
        return None

    def update_case(self, case: LegalCase) -> None:
        with self._lock:
            cases = self.load("legal_cases", [])
            for i, c in enumerate(cases):
                if c.get("id") == case.id:
                    cases[i] = case.__dict__
                    break
            else:
                cases.append(case.__dict__)
            self.save("legal_cases", cases)

    def list_cases(self) -> list[LegalCase]:
        return [LegalCase(**c) for c in self.load("legal_cases", [])]

    # ---------- audit ----------
    def audit(self, event: str, **extra: Any) -> None:
        with self._lock:
            log = self.load("audit", [])
            log.append({"ts": time.time(), "event": event, **extra})
            self.save("audit", log[-2000:])
