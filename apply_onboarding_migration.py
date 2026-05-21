import asyncio
from pathlib import Path

from sqlalchemy import text

from api.core.config import settings
from api.db.session import close_db_pool, init_db_pool


def _split_sql_statements(sql: str) -> list[str]:
    statements = [stmt.strip() for stmt in sql.split(";")]
    return [f"{stmt};" for stmt in statements if stmt]


async def run_migration() -> None:
    if not settings.supabase_connection_string:
        print("No connection string found.")
        return

    engine = await init_db_pool(settings.supabase_connection_string)
    sql = Path("sql/migrations/0028_add_onboarding_plans_table.sql").read_text(encoding="utf-8")

    async with engine.connect() as conn:
        for statement in _split_sql_statements(sql):
            await conn.execute(text(statement))
        await conn.commit()

    await close_db_pool()
    print("Applied: 0028_add_onboarding_plans_table.sql")


if __name__ == "__main__":
    if hasattr(asyncio, "WindowsSelectorEventLoopPolicy"):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_migration())
