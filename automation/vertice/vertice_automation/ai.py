from __future__ import annotations

import json
from typing import Any

import httpx

from .config import AiConfig
from .security import sanitize_for_ai


class LocalAi:
    """Cliente opcional do Ollama; nunca recebe objetos sem higienização."""

    def __init__(self, config: AiConfig):
        self.config = config

    async def available(self) -> bool:
        if not self.config.enabled or self.config.provider != "ollama":
            return False
        try:
            async with httpx.AsyncClient(timeout=3) as client:
                response = await client.get(f"{self.config.base_url.rstrip('/')}/api/tags")
                return response.is_success
        except httpx.HTTPError:
            return False

    async def structured_decision(self, task: str, facts: dict[str, Any]) -> dict[str, Any]:
        clean = sanitize_for_ai(facts)
        prompt = (
            "Responde apenas com JSON. Não inventes dados. Se houver incerteza, define "
            "action='review' e explica em reason. Tarefa: " + task + "\nDados: " +
            json.dumps(clean, ensure_ascii=False)
        )
        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.post(
                f"{self.config.base_url.rstrip('/')}/api/chat",
                json={
                    "model": self.config.model,
                    "stream": False,
                    "format": "json",
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            response.raise_for_status()
            content = response.json()["message"]["content"]
            return json.loads(content)
