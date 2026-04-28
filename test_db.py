import asyncio
from api.core.config import settings
from api.db.session import init_db_pool, get_engine
from sqlalchemy import text

async def main():
    await init_db_pool("postgresql+asyncpg://postgres:postgres@localhost:5432/postgres?ssl=" if not hasattr(settings, 'DATABASE_URL') else settings.DATABASE_URL)
    engine = get_engine()
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT github_url, name FROM repositories WHERE id = CAST('813710b4-420b-4141-aacd-eaf31b6911c8' AS uuid) LIMIT 1"))
        row = result.fetchone()
        if row:
            print(dict(row._mapping))
        else:
            print("Not found")

asyncio.run(main())
