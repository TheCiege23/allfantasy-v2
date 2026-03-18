"use client";

import type { LeagueTabProps } from "@/components/app/tabs/types";
import LeagueIntelligenceGraphPanel from "@/components/app/league-intelligence/LeagueIntelligenceGraphPanel";
import GlobalIntelligencePanel from "@/components/global-intelligence/GlobalIntelligencePanel";
import { GuillotineAIPanel } from "@/components/guillotine/GuillotineAIPanel";

export default function IntelligenceTab({ leagueId }: LeagueTabProps) {
  return (
    <div className="space-y-6">
      <GuillotineAIPanel leagueId={leagueId} />
      <GlobalIntelligencePanel leagueId={leagueId} />
      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <LeagueIntelligenceGraphPanel leagueId={leagueId} isDynasty={true} />
      </div>
    </div>
  );
}
