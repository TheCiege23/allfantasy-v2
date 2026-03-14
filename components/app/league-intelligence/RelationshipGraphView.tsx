"use client";

import { useState, useEffect, useCallback } from "react";

type MapData = {
  leagueId: string;
  season: number | null;
  nodes: Array<{ nodeId: string; nodeType: string; entityId: string; metadata: Record<string, unknown> | null }>;
  edges: Array<{ edgeId: string; fromNodeId: string; toNodeId: string; edgeType: string; weight: number }>;
  rivals: Array<{ nodeA: string; nodeB: string; weight: number }>;
  tradePartners: Array<{ fromNodeId: string; toNodeId: string; tradeCount: number; totalWeight?: number }>;
};

type ViewFilter = "all" | "rivalry" | "trade";

export function RelationshipGraphView({
  leagueId,
  season,
  onSelectManager,
}: {
  leagueId: string;
  season: number | null;
  onSelectManager?: (entityId: string) => void;
}) {
  const [data, setData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ViewFilter>("all");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const url = season != null
      ? `/api/leagues/${encodeURIComponent(leagueId)}/relationship-map?season=${season}`
      : `/api/leagues/${encodeURIComponent(leagueId)}/relationship-map`;
    fetch(url, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load map");
        return r.json();
      })
      .then(setData)
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Error");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [leagueId, season]);

  useEffect(() => {
    load();
  }, [load]);

  const nodeLabel = (nodeId: string, entityId: string) => {
    const meta = data?.nodes?.find((n) => n.nodeId === nodeId)?.metadata as Record<string, string> | undefined;
    if (meta?.ownerName) return meta.ownerName;
    if (meta?.teamName) return meta.teamName;
    if (entityId.startsWith("manager:")) return entityId.replace(/^manager:/, "").split(":")[0] ?? entityId;
    return entityId.slice(0, 20);
  };

  if (loading) return <p className="text-sm text-white/60">Loading graph...</p>;
  if (error) return <p className="text-sm text-red-300">{error}</p>;
  if (!data) return null;

  const showRivalry = filter === "all" || filter === "rivalry";
  const showTrade = filter === "all" || filter === "trade";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "rivalry", "trade"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-2 py-1 text-xs capitalize ${filter === f ? "bg-white text-black" : "border border-white/10 text-white/70 hover:bg-white/10"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="mb-2 text-xs text-white/50">
          Nodes: {data.nodes?.length ?? 0} · Edges: {data.edges?.length ?? 0}
        </p>

        {showRivalry && (data.rivals?.length ?? 0) > 0 && (
          <div className="mb-4">
            <h4 className="mb-2 text-xs font-medium text-white/70">Rivalries</h4>
            <ul className="space-y-2">
              {data.rivals.slice(0, 15).map((r, i) => (
                <li
                  key={`${r.nodeA}-${r.nodeB}-${i}`}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 px-2 py-1.5 text-sm"
                >
                  <button
                    type="button"
                    onClick={() => onSelectManager?.(data.nodes?.find((n) => n.nodeId === r.nodeA)?.entityId ?? r.nodeA)}
                    className="text-cyan-300 hover:underline"
                  >
                    {nodeLabel(r.nodeA, r.nodeA)}
                  </button>
                  <span className="text-white/50">↔</span>
                  <button
                    type="button"
                    onClick={() => onSelectManager?.(data.nodes?.find((n) => n.nodeId === r.nodeB)?.entityId ?? r.nodeB)}
                    className="text-cyan-300 hover:underline"
                  >
                    {nodeLabel(r.nodeB, r.nodeB)}
                  </button>
                  <span className="text-white/40">(w:{r.weight})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {showTrade && (data.tradePartners?.length ?? 0) > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-medium text-white/70">Trade partners</h4>
            <ul className="space-y-2">
              {data.tradePartners.slice(0, 15).map((t, i) => (
                <li
                  key={`${t.fromNodeId}-${t.toNodeId}-${i}`}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 px-2 py-1.5 text-sm"
                >
                  <button
                    type="button"
                    onClick={() => onSelectManager?.(data.nodes?.find((n) => n.nodeId === t.fromNodeId)?.entityId ?? t.fromNodeId)}
                    className="text-cyan-300 hover:underline"
                  >
                    {nodeLabel(t.fromNodeId, t.fromNodeId)}
                  </button>
                  <span className="text-white/50">⇄</span>
                  <button
                    type="button"
                    onClick={() => onSelectManager?.(data.nodes?.find((n) => n.nodeId === t.toNodeId)?.entityId ?? t.toNodeId)}
                    className="text-cyan-300 hover:underline"
                  >
                    {nodeLabel(t.toNodeId, t.toNodeId)}
                  </button>
                  <span className="text-white/40">{t.tradeCount} trades</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {showRivalry && (data.rivals?.length ?? 0) === 0 && showTrade && (data.tradePartners?.length ?? 0) === 0 && (
          <p className="text-sm text-white/50">No relationships in this view. Try building the graph or selecting All seasons.</p>
        )}
      </div>
    </div>
  );
}
