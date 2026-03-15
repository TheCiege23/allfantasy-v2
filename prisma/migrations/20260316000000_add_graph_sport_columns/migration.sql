-- AlterTable: add optional sport to graph_nodes and graph_edges for Prompt 34 League Intelligence Graph.

-- GraphNode: add sport column and index
ALTER TABLE "graph_nodes" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);

CREATE INDEX IF NOT EXISTS "graph_nodes_leagueId_sport_idx" ON "graph_nodes"("leagueId", "sport");

-- GraphEdge: add sport column and index
ALTER TABLE "graph_edges" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(16);

CREATE INDEX IF NOT EXISTS "graph_edges_edgeType_sport_idx" ON "graph_edges"("edgeType", "sport");
