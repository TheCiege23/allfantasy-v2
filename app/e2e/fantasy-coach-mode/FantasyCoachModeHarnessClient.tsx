"use client"

import { useEffect, useState } from "react"
import { CoachAdvicePanel, type CoachAdviceRequester } from "@/components/coach/CoachAdvicePanel"
import type { AdviceType } from "@/lib/fantasy-coach/types"

const ADVICE_BY_TYPE: Record<AdviceType, { summary: string; bullets: string[]; challenge: string }> = {
  lineup: {
    summary: "Lineup edge: start the highest-floor core and use matchup upside in flex.",
    bullets: [
      "Prioritize projection leaders for locked starters.",
      "Use matchup-adjusted upside at flex if you need ceiling.",
      "Re-check injury tags before kickoff windows.",
    ],
    challenge: "Finalize your flex decision one hour before lock.",
  },
  trade: {
    summary: "Trade edge: package bench depth into one reliable weekly starter.",
    bullets: [
      "Target managers with opposite positional needs.",
      "Move volatile producers while their value is elevated.",
      "Request fair two-for-one upgrades, not headline names only.",
    ],
    challenge: "Send one concrete trade offer today.",
  },
  waiver: {
    summary: "Waiver edge: prioritize role growth and near-term starter paths.",
    bullets: [
      "Spend on players with 1-2 week start viability.",
      "Protect your RB room with direct handcuff coverage.",
      "Avoid one-week spikes with no usage signal.",
    ],
    challenge: "Submit claims with pre-planned drops before waivers run.",
  },
}

const requestAdvice: CoachAdviceRequester = async ({ type }) => {
  const resolved = ADVICE_BY_TYPE[type]
  return {
    type,
    summary: resolved.summary,
    bullets: resolved.bullets,
    challenge: resolved.challenge,
    tone: "motivational",
  }
}

export default function FantasyCoachModeHarnessClient() {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  return (
    <div className="min-h-screen bg-[#040915] p-6 text-white">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold">Fantasy Coach Mode Harness</h1>
        <p className="text-sm text-white/70">
          Deterministic harness for coach mode button and strategy explanation panel audit.
        </p>
        <p className="text-xs text-white/50" data-testid="fantasy-coach-hydrated-flag">
          {hydrated ? "hydrated" : "hydrating"}
        </p>
        <CoachAdvicePanel
          leagueId="league-coach-1"
          leagueName="Coach League"
          week={9}
          teamName="Starter Squad"
          sport="NBA"
          requestAdvice={requestAdvice}
        />
      </div>
    </div>
  )
}
