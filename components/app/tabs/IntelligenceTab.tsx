"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LeagueTabProps } from "@/components/app/tabs/types";
import LeagueIntelligenceGraphPanel from "@/components/app/league-intelligence/LeagueIntelligenceGraphPanel";
import { UnifiedRelationshipInsightsPanel } from "@/components/app/league-intelligence/UnifiedRelationshipInsightsPanel";
import GlobalIntelligencePanel from "@/components/global-intelligence/GlobalIntelligencePanel";
import { GuillotineAIPanel } from "@/components/guillotine/GuillotineAIPanel";
import { normalizeToSupportedSport } from "@/lib/sport-scope";

export default function IntelligenceTab({ leagueId }: LeagueTabProps) {
  const [sport, setSport] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/leagues/${encodeURIComponent(leagueId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((league) => {
        if (!active || !league) return;
        setSport(normalizeToSupportedSport(league.sport ?? null));
      })
      .catch(() => {
        if (active) setSport(null);
      });
    return () => {
      active = false;
    };
  }, [leagueId]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link
          href={`/app/league/${encodeURIComponent(leagueId)}/relationship-insights`}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
        >
          Open unified insights workspace
        </Link>
      </div>
      <GuillotineAIPanel leagueId={leagueId} />
      <GlobalIntelligencePanel leagueId={leagueId} sport={sport} />
      <UnifiedRelationshipInsightsPanel leagueId={leagueId} />
      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <LeagueIntelligenceGraphPanel leagueId={leagueId} isDynasty={true} />
      </div>
    </div>
  );
}
