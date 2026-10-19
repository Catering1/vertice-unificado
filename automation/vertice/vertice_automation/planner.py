from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class PlannedAction:
    action: str
    product_id: str
    product_name: str
    account: str | None = None
    ad_id: str | None = None
    reason: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _olx_links(source_data: dict[str, Any]) -> list[dict[str, Any]]:
    raw = source_data.get("olx") if isinstance(source_data, dict) else None
    if isinstance(raw, list):
        return [item for item in raw if isinstance(item, dict)]
    if isinstance(raw, dict):
        return [raw]
    return []


def plan_reconciliation(
    products: list[dict[str, Any]], olx_items: list[dict[str, Any]]
) -> list[PlannedAction]:
    live_by_id = {str(item.get("id")): item for item in olx_items if item.get("id")}
    active_ids = {identifier for identifier, item in live_by_id.items() if item.get("status") == "ativos"}
    actions: list[PlannedAction] = []
    for product in products:
        mappings = _olx_links(product.get("source_data") or {})
        mapped_active = [m for m in mappings if str(m.get("id")) in active_ids]
        if product.get("commercial_status") == "sold":
            for mapping in mapped_active:
                actions.append(
                    PlannedAction(
                        "withdraw",
                        str(product["id"]),
                        str(product["name"]),
                        str(mapping.get("account") or live_by_id[str(mapping.get("id"))].get("account") or ""),
                        str(mapping.get("id")),
                        "produto vendido no dashboard e anúncio confirmado em Ativos",
                    )
                )
        elif product.get("commercial_status") == "active" and not mapped_active:
            known_non_active = [m for m in mappings if str(m.get("id")) in live_by_id]
            if known_non_active:
                actions.append(
                    PlannedAction(
                        "recover_existing",
                        str(product["id"]),
                        str(product["name"]),
                        ad_id=str(known_non_active[0].get("id")),
                        reason="produto ativo com anúncio existente fora de Ativos",
                    )
                )
            else:
                actions.append(
                    PlannedAction(
                        "create",
                        str(product["id"]),
                        str(product["name"]),
                        reason="produto ativo sem anúncio ativo confirmado nas duas contas",
                    )
                )
    return actions
