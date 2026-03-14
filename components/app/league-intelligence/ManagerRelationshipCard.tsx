"use client";

type Profile = {
  strongestRivalries?: Array<{ nodeA: string; nodeB: string; intensityScore: number; weight: number }>;
  tradeClusters?: Array<{ id: string; members: Array<{ nodeId: string; entityId: string }>; dominantPair?: { nodeA: string; nodeB: string; weight: number } }>;
  influenceLeaders?: Array<{ nodeId: string; entityId: string; compositeScore: number; centralityScore: number; tradeInfluenceScore: number; rivalryInfluenceScore: number; championshipImpactScore: number }>;
};

export function ManagerRelationshipCard({
  leagueId,
  entityId,
  nodeId,
  centralityScore,
  profile,
}: {
  leagueId: string;
  entityId: string;
  nodeId: string;
  centralityScore: number;
  profile: Profile;
}) {
  const rivals = (profile.strongestRivalries ?? []).filter(
    (r) => r.nodeA === nodeId || r.nodeB === nodeId
  );
  const myClusters = (profile.tradeClusters ?? []).filter((c) =>
    c.members?.some((m: { nodeId: string }) => m.nodeId === nodeId)
  );
  const tradePartners = myClusters.flatMap((c) =>
    (c.members ?? []).filter((m: { nodeId: string }) => m.nodeId !== nodeId)
  );
  const influence = (profile.influenceLeaders ?? []).find((l) => l.nodeId === nodeId || l.entityId === entityId);

  const displayName = entityId.startsWith("manager:")
    ? entityId.replace(/^manager:/, "").split(":")[0] ?? entityId
    : entityId.slice(0, 24);

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-white">{displayName}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80">
          Centrality {(centralityScore * 100).toFixed(0)}%
        </span>
      </div>
      {influence && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/60">
          <span>Influence {(influence.compositeScore * 100).toFixed(0)}%</span>
          {influence.championshipImpactScore > 0 && (
            <span>Champ impact {(influence.championshipImpactScore * 100).toFixed(0)}%</span>
          )}
        </div>
      )}
      {rivals.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-white/50">Key rivals</div>
          <ul className="mt-1 space-y-0.5 text-sm text-white/80">
            {rivals.slice(0, 3).map((r, i) => (
              <li key={i}>
                vs {r.nodeA === nodeId ? r.nodeB : r.nodeA} (intensity {r.intensityScore.toFixed(0)})
              </li>
            ))}
          </ul>
        </div>
      )}
      {tradePartners.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-white/50">Trade cluster partners</div>
          <ul className="mt-1 space-y-0.5 text-sm text-white/80">
            {tradePartners.slice(0, 5).map((m: { entityId: string; nodeId: string }, i: number) => (
              <li key={i}>{m.entityId?.replace(/^manager:/, "").split(":")[0] ?? m.nodeId}</li>
            ))}
          </ul>
        </div>
      )}
      {rivals.length === 0 && tradePartners.length === 0 && !influence && (
        <p className="mt-2 text-xs text-white/50">No relationship data for this manager.</p>
      )}
    </div>
  );
}
