"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { SideBySideChart } from "@/components/player-comparison-lab/SideBySideChart"
import { AIExplanationPanel } from "@/components/player-comparison-lab/AIExplanationPanel"
import type { ComparisonMatrixRow, ResolvedPlayerStats } from "@/lib/player-comparison-lab/types"

export default function PlayerComparisonLabHarnessClient() {
  const [compared, setCompared] = useState(false)

  const players = useMemo<ResolvedPlayerStats[]>(
    () => [
      {
        name: "Josh Allen",
        position: "QB",
        team: "BUF",
        historical: [{ season: "2024", gamesPlayed: 17, fantasyPoints: 395, fantasyPointsPerGame: 23.2 }],
        projection: {
          value: 9250,
          rank: 5,
          positionRank: 2,
          trend30Day: 190,
          redraftValue: 365,
          source: "fantasycalc",
          position: "QB",
          team: "BUF",
          volatility: 13,
        },
      },
      {
        name: "Jalen Hurts",
        position: "QB",
        team: "PHI",
        historical: [{ season: "2024", gamesPlayed: 17, fantasyPoints: 372, fantasyPointsPerGame: 21.9 }],
        projection: {
          value: 8820,
          rank: 8,
          positionRank: 4,
          trend30Day: 165,
          redraftValue: 344,
          source: "fantasycalc",
          position: "QB",
          team: "PHI",
          volatility: 17,
        },
      },
    ],
    []
  )

  const matrix = useMemo<ComparisonMatrixRow[]>(
    () => [
      { dimensionId: "market_value", label: "Market value", valuesByPlayer: { "Josh Allen": 9250, "Jalen Hurts": 8820 }, winnerName: "Josh Allen", higherIsBetter: true },
      { dimensionId: "fantasy_production", label: "Fantasy production", valuesByPlayer: { "Josh Allen": 23.2, "Jalen Hurts": 21.9 }, winnerName: "Josh Allen", higherIsBetter: true },
      { dimensionId: "projection", label: "Projection", valuesByPlayer: { "Josh Allen": 365, "Jalen Hurts": 344 }, winnerName: "Josh Allen", higherIsBetter: true },
      { dimensionId: "volatility", label: "Volatility", valuesByPlayer: { "Josh Allen": 13, "Jalen Hurts": 17 }, winnerName: "Josh Allen", higherIsBetter: false },
      { dimensionId: "consistency", label: "Consistency", valuesByPlayer: { "Josh Allen": 87, "Jalen Hurts": 79 }, winnerName: "Josh Allen", higherIsBetter: true },
      { dimensionId: "trend_momentum", label: "Trend momentum", valuesByPlayer: { "Josh Allen": 190, "Jalen Hurts": 165 }, winnerName: "Josh Allen", higherIsBetter: true },
    ],
    []
  )

  const summaryLines = useMemo(
    () => ["Market value: Josh Allen (9250).", "Fantasy production: Josh Allen (23.2)."],
    []
  )

  return (
    <div className="min-h-screen bg-[#040915] p-6 text-white">
      <div className="mx-auto max-w-6xl space-y-4">
        <h1 className="text-2xl font-semibold">Player Comparison Lab Harness</h1>
        <p className="text-sm text-white/70">
          Deterministic harness for compare action, chart toggles, and AI insight audit.
        </p>
        <Button
          onClick={() => setCompared(true)}
          data-testid="compare-player-button"
          data-audit="compare-player-button"
          className="w-fit"
        >
          Compare players
        </Button>

        {compared && (
          <div className="space-y-4">
            <SideBySideChart matrix={matrix} players={players} />
            <AIExplanationPanel
              playerNames={players.map((p) => p.name)}
              summaryLines={summaryLines}
              onRetryAnalysis={async () =>
                "Josh Allen has the stronger blend of historical production and projection value. In redraft and dynasty, Allen holds the edge due to better trend momentum and lower volatility."
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}
