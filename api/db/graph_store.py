from __future__ import annotations

import json
from uuid import UUID

from sqlalchemy import text

from api.db.models import RepoGraph
from api.db.session import get_engine


class GraphStoreManager:
    async def save_graph(self, repo_id: UUID, nodes: list[dict], edges: list[dict]) -> None:
        engine = get_engine()
        if engine is None:
            raise ValueError("Database engine is not initialized.")

        query = text(
            """
            INSERT INTO repo_graph (repo_id, nodes, edges, updated_at)
            VALUES (CAST(:repo_id AS uuid), CAST(:nodes AS jsonb), CAST(:edges AS jsonb), NOW())
            ON CONFLICT (repo_id)
            DO UPDATE SET
              nodes = EXCLUDED.nodes,
              edges = EXCLUDED.edges,
              updated_at = NOW()
            """
        )

        async with engine.connect() as conn:
            await conn.execute(
                query,
                {
                    "repo_id": str(repo_id),
                    "nodes": json.dumps(nodes),
                    "edges": json.dumps(edges),
                },
            )
            await conn.commit()

    async def get_graph(self, repo_id: UUID) -> RepoGraph | None:
        engine = get_engine()
        if engine is None:
            return None

        query = text(
            """
            SELECT repo_id, nodes, edges, updated_at
            FROM repo_graph
            WHERE repo_id = CAST(:repo_id AS uuid)
            LIMIT 1
            """
        )

        async with engine.connect() as conn:
            result = await conn.execute(query, {"repo_id": str(repo_id)})
            row = result.fetchone()

        if row is None:
            return None

        m = row._mapping
        return RepoGraph(
            repo_id=m["repo_id"],
            nodes=list(m["nodes"] or []),
            edges=list(m["edges"] or []),
            updated_at=m["updated_at"],
        )
