from vertice_automation.planner import plan_reconciliation


def test_planner_withdraws_sold_and_creates_missing_active():
    products = [
        {"id": "p1", "name": "Fold", "commercial_status": "sold", "source_data": {"olx": {"id": "10", "account": "conta 2"}}},
        {"id": "p2", "name": "Buds", "commercial_status": "active", "source_data": {}},
    ]
    olx = [{"id": "10", "status": "ativos", "account": "conta 2"}]
    actions = plan_reconciliation(products, olx)
    assert [(a.action, a.product_id) for a in actions] == [("withdraw", "p1"), ("create", "p2")]


def test_planner_does_not_duplicate_active_mapping():
    products = [
        {"id": "p1", "name": "Watch", "commercial_status": "active", "source_data": {"olx": {"id": "20"}}}
    ]
    assert plan_reconciliation(products, [{"id": "20", "status": "ativos", "account": "conta 1"}]) == []
