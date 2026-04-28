import asyncio
from sqlalchemy import text
from api.db.session import init_db_pool, close_db_pool
from api.core.config import settings

async def run_migration():
    if not settings.supabase_connection_string:
        print("No connection string found.")
        return
        
    engine = await init_db_pool(settings.supabase_connection_string)
    
    with open("sql/migrations/0014_add_annotations_table.sql", "r") as f:
        sql = f.read()
        
    async with engine.connect() as conn:
        await conn.execute(text(sql))
        await conn.commit()
        print("Migration applied successfully.")
        
    await close_db_pool()

import sys

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_migration())
