from vertice_automation.security import sanitize_for_ai


def test_sanitize_removes_secrets_and_personal_identifiers():
    value = {
        "product": "Galaxy S26+",
        "password": "segredo",
        "access_token": "token",
        "notes": "Contactar teste@example.com ou +351 912345678; IMEI 123456789012345",
        "nested": {"cookies": ["session=x"], "color": "preto"},
    }
    clean = sanitize_for_ai(value)
    assert clean["product"] == "Galaxy S26+"
    assert "password" not in clean
    assert "access_token" not in clean
    assert "cookies" not in clean["nested"]
    assert clean["nested"]["color"] == "preto"
    assert "teste@example.com" not in clean["notes"]
    assert "912345678" not in clean["notes"]
    assert "123456789012345" not in clean["notes"]
