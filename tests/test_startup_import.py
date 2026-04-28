def test_api_main_import_smoke() -> None:
    from api.main import app

    assert app.title == "DevBridge API"
