from api.db.session import _normalize_connection_string


def test_normalize_conninfo_string_with_sslmode_suffix() -> None:
    raw = (
        "host=db.example.supabase.co port=5432 user=postgres "
        "password=RedHotChilliPepper@123 dbname=postgres?sslmode=require"
    )

    normalized = _normalize_connection_string(raw)

    assert normalized.startswith("postgresql+psycopg://postgres:RedHotChilliPepper%40123@")
    assert "db.example.supabase.co:5432/postgres" in normalized
    assert "sslmode=require" in normalized


def test_normalize_conninfo_defaults_sslmode() -> None:
    raw = "host=localhost port=5432 user=postgres password=secret dbname=postgres"

    normalized = _normalize_connection_string(raw)

    assert normalized.startswith("postgresql+psycopg://")
    assert "sslmode=require" in normalized


def test_normalize_url_encodes_reserved_password_chars() -> None:
    raw = "postgresql://postgres:abc@123@db.example.supabase.co:5432/postgres"

    normalized = _normalize_connection_string(raw)

    assert normalized.startswith("postgresql+psycopg://")
    assert "abc%40123" in normalized
    assert normalized.count("@") == 1