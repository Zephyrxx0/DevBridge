import asyncio
from pathlib import Path
from sqlalchemy import text
from api.db.session import init_db_pool, close_db_pool
from api.core.config import settings


def _split_sql_statements(sql: str) -> list[str]:
    statements = [stmt.strip() for stmt in sql.split(";")]
    return [f"{stmt};" for stmt in statements if stmt]

async def run_migration():
    if not settings.supabase_connection_string:
        print("No connection string found.")
        return
        
    engine = await init_db_pool(settings.supabase_connection_string)
    
    migration_dir = Path("sql/migrations")
    migration_files = sorted(migration_dir.glob("*.sql"))
    if not migration_files:
        print("No migration files found.")
        await close_db_pool()
        return

    async with engine.connect() as conn:
        for migration_file in migration_files:
            sql = migration_file.read_text(encoding="utf-8")
            for statement in _split_sql_statements(sql):
                await conn.execute(text(statement))
            print(f"Applied: {migration_file.name}")
        await conn.commit()
        print("Migrations applied successfully.")
        
    await close_db_pool()

import sys

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_migration())
