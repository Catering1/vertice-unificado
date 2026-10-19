from pathlib import Path

from vertice_automation.config import Config


def test_example_config_loads():
    path = Path(__file__).parents[1] / "config.example.toml"
    config = Config.load(path)
    assert set(config.profiles) == {"dashboard", "olx1", "olx2"}
    assert config.runtime.audit_only is True
    assert config.ai.provider == "ollama"
