from __future__ import annotations

import asyncio
import os
import subprocess
from pathlib import Path

from playwright.async_api import BrowserContext, Playwright, async_playwright


def _profile_process_ids(profile: Path) -> list[int]:
    env = os.environ.copy()
    env["VERTICE_CHROME_PROFILE"] = str(profile.resolve())
    script = r"""
$target = [IO.Path]::GetFullPath($env:VERTICE_CHROME_PROFILE)
Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction Stop |
  Where-Object {
    $cmd = $_.CommandLine
    if (-not $cmd -or $cmd -match '--type=') { return $false }
    $arg = [regex]::Match($cmd, '(?:^|\s)--user-data-dir=(?:"([^"]+)"|([^\s"]+))(?=\s|$)')
    if (-not $arg.Success) { return $false }
    $path = if ($arg.Groups[1].Success) { $arg.Groups[1].Value } else { $arg.Groups[2].Value }
    [string]::Equals([IO.Path]::GetFullPath($path).TrimEnd('\'), $target.TrimEnd('\'), [StringComparison]::OrdinalIgnoreCase)
  } | ForEach-Object { $_.ProcessId }
"""
    result = subprocess.run(
        ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", script],
        capture_output=True,
        text=True,
        timeout=20,
        env=env,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        check=False,
    )
    if result.returncode:
        return []
    return [int(line) for line in result.stdout.splitlines() if line.strip().isdigit()]


def _close_profile_processes(profile: Path) -> int:
    pids = _profile_process_ids(profile)
    for pid in pids:
        subprocess.run(
            ["taskkill.exe", "/PID", str(pid), "/T", "/F"],
            capture_output=True,
            timeout=20,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            check=False,
        )
    return len(pids)


async def launch_profile(
    profile: Path, *, headless: bool, timezone: str
) -> tuple[Playwright, BrowserContext]:
    """Abre um perfil dedicado; numa colisão fecha apenas esse perfil e repete."""
    profile.mkdir(parents=True, exist_ok=True)
    playwright = await async_playwright().start()

    async def launch() -> BrowserContext:
        return await playwright.chromium.launch_persistent_context(
            user_data_dir=str(profile),
            channel="chrome",
            headless=headless,
            locale="pt-PT",
            timezone_id=timezone,
            args=["--no-first-run", "--no-default-browser-check"],
        )

    try:
        return playwright, await launch()
    except Exception as exc:
        if type(exc).__name__ != "TargetClosedError":
            await playwright.stop()
            raise
        await asyncio.to_thread(_close_profile_processes, profile)
        await asyncio.sleep(2)
        try:
            return playwright, await launch()
        except Exception:
            await playwright.stop()
            raise


async def close_profile(playwright: Playwright, context: BrowserContext) -> None:
    try:
        await context.close()
    finally:
        await playwright.stop()
