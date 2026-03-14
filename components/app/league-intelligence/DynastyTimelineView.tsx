"use client";

type Transition = {
  fromSeason: number;
  toSeason: number;
  fromNodeIds: string[];
  toNodeIds: string[];
  type: string;
};

type Profile = {
  dynastyPowerTransitions?: Transition[];
  strongestRivalries?: unknown[];
  influenceLeaders?: Array<{ entityId: string; nodeId: string }>;
};

type DynastySeason = { season: number; platformLeagueId: string; importedAt: string };

export function DynastyTimelineView({
  leagueId,
  profile,
  dynastySeasons,
}: {
  leagueId: string;
  profile: Profile;
  dynastySeasons: DynastySeason[];
}) {
  const transitions = profile.dynastyPowerTransitions ?? [];
  const seasons = dynastySeasons.length > 0
    ? [...new Set(dynastySeasons.map((d) => d.season))].sort((a, b) => a - b)
    : [...new Set(transitions.flatMap((t) => [t.fromSeason, t.toSeason]))].filter((s) => s > 0).sort((a, b) => a - b);

  if (seasons.length === 0 && transitions.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
        No dynasty timeline data yet. Run dynasty backfill for this league to see historical power shifts.
      </div>
    );
  }

  const transitionByToSeason = new Map<number, Transition>();
  for (const t of transitions) {
    transitionByToSeason.set(t.toSeason, t);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-white/60">
        Power shifts and championship transitions{seasons.length > 0 ? ` (${seasons.length} seasons)` : ""}.
      </p>
      <div className="relative space-y-0">
        {seasons.map((s, i) => {
          const t = transitionByToSeason.get(s);
          const isLast = i === seasons.length - 1;
          return (
            <div key={s} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="h-3 w-3 shrink-0 rounded-full border-2 border-cyan-400/60 bg-cyan-500/20" />
                {!isLast && <div className="mt-0 w-px flex-1 bg-white/20" style={{ minHeight: 24 }} />}
              </div>
              <div className="pb-6">
                <div className="font-medium text-white">Season {s}</div>
                {t && (
                  <div className="mt-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs">
                    <span className={`capitalize ${t.type === "succession" ? "text-amber-300" : t.type === "decline" ? "text-red-300/90" : "text-white/70"}`}>
                      {t.type}
                    </span>
                    {t.toNodeIds.length > 0 && (
                      <span className="ml-1 text-white/60">
                        → {t.toNodeIds.length} champ(s)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {transitions.length > 0 && (
        <div className="mt-4 rounded-xl border border-white/10 p-3 text-xs text-white/60">
          {transitions.length} power transition(s) detected across seasons. Green = succession, Red = decline, Gray = shift.
        </div>
      )}
    </div>
  );
}
