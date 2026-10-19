from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

from vertice_automation.config import Config
from vertice_automation.profiles import _profile_process_ids


def find_chrome() -> Path:
    candidates = [
        Path(os.environ.get("PROGRAMFILES", r"C:\Program Files")) / "Google/Chrome/Application/chrome.exe",
        Path(os.environ.get("PROGRAMFILES(X86)", r"C:\Program Files (x86)")) / "Google/Chrome/Application/chrome.exe",
        Path(os.environ.get("LOCALAPPDATA", "")) / "Google/Chrome/Application/chrome.exe",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    raise FileNotFoundError("Não encontrei o Google Chrome instalado. Instala/atualiza o Chrome e tenta novamente.")


def setup(config: Config, profile_name: str) -> None:
    if sys.platform != "win32":
        raise RuntimeError("A configuração dos perfis está preparada para Chrome no Windows.")
    url_key = "olx" if profile_name.startswith("olx") else profile_name
    profile = config.profiles[profile_name]
    profile.mkdir(parents=True, exist_ok=True)
    if _profile_process_ids(profile):
        raise RuntimeError(
            f"O perfil {profile_name} já está aberto. Fecha essa janela Chrome antes de continuar."
        )
    chrome = find_chrome()
    command = [
        str(chrome),
        f"--user-data-dir={profile}",
        "--no-first-run",
        "--no-default-browser-check",
        config.urls[url_key],
    ]
    print(f"A abrir o Chrome normal para o perfil {profile_name}.")
    print("Inicia sessão manualmente. O Google não aceita iniciar sessão num browser controlado por automação.")
    print("Fecha todas as janelas deste perfil quando terminares; a sessão fica guardada localmente.")
    process = subprocess.Popen(command)
    process.wait()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("profile", choices=["dashboard", "olx1", "olx2"])
    parser.add_argument("--config", type=Path, required=True)
    args = parser.parse_args()
    setup(Config.load(args.config), args.profile)


if __name__ == "__main__":
    main()
