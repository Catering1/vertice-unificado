from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class RuntimeConfig:
    headless: bool
    timezone: str
    retry_minutes: int
    max_runtime_minutes: int
    audit_only: bool


@dataclass(frozen=True)
class AiConfig:
    enabled: bool
    provider: str
    base_url: str
    model: str
    minimum_confidence: float


@dataclass(frozen=True)
class Config:
    root: Path
    runtime: RuntimeConfig
    profiles: dict[str, Path]
    urls: dict[str, str]
    ai: AiConfig
    telegram: bool

    @classmethod
    def load(cls, path: Path) -> "Config":
        if not path.exists():
            raise FileNotFoundError(
                f"Falta {path}. Copia config.example.toml para config.toml e executa setup_profiles.ps1."
            )
        raw = tomllib.loads(path.read_text(encoding="utf-8"))
        base = path.parent.resolve()
        profile_root = Path(os.path.expandvars(raw["profiles"]["root"])).expanduser()
        profiles = {
            name: profile_root / raw["profiles"][name]
            for name in ("dashboard", "olx1", "olx2")
        }
        runtime_raw = raw["runtime"]
        ai_raw = raw.get("ai", {})
        return cls(
            root=base,
            runtime=RuntimeConfig(
                headless=bool(runtime_raw.get("headless", True)),
                timezone=str(runtime_raw.get("timezone", "Europe/Lisbon")),
                retry_minutes=int(runtime_raw.get("retry_minutes", 15)),
                max_runtime_minutes=int(runtime_raw.get("max_runtime_minutes", 120)),
                audit_only=bool(runtime_raw.get("audit_only", True)),
            ),
            profiles=profiles,
            urls={key: str(value) for key, value in raw["urls"].items()},
            ai=AiConfig(
                enabled=bool(ai_raw.get("enabled", False)),
                provider=str(ai_raw.get("provider", "ollama")),
                base_url=str(ai_raw.get("base_url", "http://127.0.0.1:11434")),
                model=str(ai_raw.get("model", "gemma3:4b")),
                minimum_confidence=float(ai_raw.get("minimum_confidence", 0.85)),
            ),
            telegram=bool(raw.get("notifications", {}).get("telegram", False)),
        )
