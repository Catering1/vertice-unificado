from __future__ import annotations

import argparse
import asyncio
import ctypes
import json
import logging
import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import AsyncIterator

from .ai import LocalAi
from .config import Config
from .probes import ProbeResult, probe_dashboard, probe_olx
from .profiles import close_profile, launch_profile
from .planner import plan_reconciliation


LOGGER = logging.getLogger("vertice-automation")


def process_exists(pid: int) -> bool:
    if os.name != "nt":
        try:
            os.kill(pid, 0)
            return True
        except OSError:
            return False
    process_query_limited_information = 0x1000
    handle = ctypes.windll.kernel32.OpenProcess(process_query_limited_information, False, pid)
    if not handle:
        return False
    ctypes.windll.kernel32.CloseHandle(handle)
    return True


class RunLock:
    def __init__(self, path: Path):
        self.path = path
        self.handle = None

    def __enter__(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if self.path.exists():
            try:
                owner_pid = int(self.path.read_text(encoding="utf-8").strip())
                owner_is_running = process_exists(owner_pid)
            except (OSError, ValueError):
                owner_is_running = False
            if not owner_is_running:
                # Uma execução interrompida pode deixar o ficheiro para trás.
                # Só o removemos quando o processo proprietário já não existe.
                self.path.unlink(missing_ok=True)
        try:
            self.handle = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(self.handle, str(os.getpid()).encode())
        except FileExistsError as exc:
            raise RuntimeError("Já existe uma execução da automação Vértice em curso.") from exc
        return self

    def __exit__(self, *_):
        if self.handle is not None:
            os.close(self.handle)
        self.path.unlink(missing_ok=True)


@asynccontextmanager
async def opened_profile(config: Config, name: str) -> AsyncIterator:
    pw, context = await launch_profile(
        config.profiles[name],
        headless=config.runtime.headless,
        timezone=config.runtime.timezone,
    )
    try:
        yield context
    finally:
        await close_profile(pw, context)


async def audit(config: Config) -> list[ProbeResult]:
    # A Vinted não é acedida por automação; a revisão de compras fica manual.
    results: list[ProbeResult] = [
        ProbeResult(
            "vinted", "revisão manual", False, "",
            evidence=["Rever compras e encomendas manualmente; a rotina não acede à Vinted."],
        )
    ]
    # Sequencial por desenho: evita três Chromes pesados ao mesmo tempo.
    jobs = (
        ("dashboard", lambda ctx: probe_dashboard(ctx, config.urls["dashboard"])),
        ("olx1", lambda ctx: probe_olx(ctx, config.urls["olx"], "conta 1")),
        ("olx2", lambda ctx: probe_olx(ctx, config.urls["olx"], "conta 2")),
    )
    for profile_name, probe in jobs:
        LOGGER.info("A verificar %s", profile_name)
        try:
            async with opened_profile(config, profile_name) as context:
                result = await probe(context)
        except Exception as exc:
            result = ProbeResult(profile_name, profile_name, False, "", error=str(exc))
        results.append(result)
        LOGGER.info("%s: autenticado=%s", profile_name, result.authenticated)
    return results


def write_report(config: Config, results: list[ProbeResult], ai_available: bool) -> Path:
    report_dir = config.root / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().astimezone().strftime("%Y-%m-%d_%H-%M-%S")
    path = report_dir / f"run-{stamp}.json"
    dashboard = next((r for r in results if r.service == "dashboard"), None)
    olx_items = [item for result in results if result.service == "olx" for item in result.items]
    olx_results = [result for result in results if result.service == "olx"]
    ready_for_actions = (
        len(results) == 4
        and all(result.authenticated for result in results)
        and dashboard is not None
        and bool(dashboard.items)
        and len(olx_results) == 2
        and all("inventário Ativos do OLX confirmado" in result.evidence for result in olx_results)
    )
    actions = (
        plan_reconciliation(dashboard.items, olx_items)
        if ready_for_actions and dashboard is not None
        else []
    )
    payload = {
        "started_at": datetime.now().astimezone().isoformat(),
        "mode": "audit" if config.runtime.audit_only else "actions-enabled",
        "ai": {"provider": config.ai.provider, "available": ai_available},
        "services": [result.to_dict() for result in results],
        "ready_for_actions": ready_for_actions,
        "planned_actions": [action.to_dict() for action in actions],
        "changes": [],
        "note": (
            "A revisão da Vinted é manual. O planeamento requer as sessões "
            "dashboard/OLX, dados do dashboard e inventário Ativos confirmado nas duas contas OLX."
        ),
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def _state_path(config: Config) -> Path:
    return config.root / "state" / "last-run.json"


def should_skip_today(config: Config) -> bool:
    path = _state_path(config)
    if not path.exists():
        return False
    try:
        state = json.loads(path.read_text(encoding="utf-8"))
        return state.get("date") == datetime.now().astimezone().date().isoformat() and state.get("status") == "success"
    except (OSError, ValueError):
        return False


def record_state(config: Config, status: str, report: Path) -> None:
    path = _state_path(config)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {
                "date": datetime.now().astimezone().date().isoformat(),
                "finished_at": datetime.now().astimezone().isoformat(),
                "status": status,
                "report": str(report),
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


async def run(config: Config) -> int:
    results = await audit(config)
    ai_available = await LocalAi(config.ai).available()
    report = write_report(config, results, ai_available)
    LOGGER.info("Relatório: %s", report)
    failed = [r for r in results if r.service != "vinted" and not r.authenticated]
    if failed:
        record_state(config, "needs_login", report)
        LOGGER.warning("Perfis que precisam de autenticação: %s", ", ".join(r.account for r in failed))
        return 2
    record_state(config, "manual_vinted_review", report)
    LOGGER.warning("A revisão da Vinted é manual; não foram feitas alterações externas.")
    return 2


def configure_logging(root: Path) -> None:
    logs = root / "logs"
    logs.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[
            logging.FileHandler(logs / "vertice-automation.log", encoding="utf-8"),
            logging.StreamHandler(sys.stdout),
        ],
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=Path(__file__).parents[1] / "config.toml")
    parser.add_argument("--force", action="store_true", help="executa mesmo que hoje já tenha terminado com sucesso")
    args = parser.parse_args()
    config = Config.load(args.config.resolve())
    configure_logging(config.root)
    with RunLock(config.root / "state" / "run.lock"):
        if not args.force and should_skip_today(config):
            LOGGER.info("A rotina já terminou com sucesso hoje; execução de recuperação ignorada.")
            return 0
        return asyncio.run(asyncio.wait_for(run(config), timeout=config.runtime.max_runtime_minutes * 60))


if __name__ == "__main__":
    raise SystemExit(main())
