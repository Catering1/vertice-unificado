import json
from datetime import datetime
from pathlib import Path

from vertice_automation.config import Config
from vertice_automation.runner import should_skip_today


def test_recovery_skips_only_after_success(tmp_path: Path):
    source = Path(__file__).parents[1] / "config.example.toml"
    config_path = tmp_path / "config.toml"
    config_path.write_text(source.read_text(encoding="utf-8"), encoding="utf-8")
    config = Config.load(config_path)
    state = tmp_path / "state"
    state.mkdir()
    path = state / "last-run.json"
    today = datetime.now().astimezone().date().isoformat()
    path.write_text(json.dumps({"date": today, "status": "needs_login"}), encoding="utf-8")
    assert should_skip_today(config) is False
    path.write_text(json.dumps({"date": today, "status": "success"}), encoding="utf-8")
    assert should_skip_today(config) is True
