"use client";

import type { LeagueTabProps } from "@/components/app/tabs/types";
import LeagueIntelligenceGraphPanel from "@/components/app/league-intelligence/LeagueIntelligenceGraphPanel";

export default function IntelligenceTab({ leagueId }: LeagueTabProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <LeagueIntelligenceGraphPanel leagueId={leagueId} isDynasty={true} />
    </div>
  );
}
