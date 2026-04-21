'use client'

import { useMemo } from 'react'
import { SimulationPanel } from '@/components/ai/sim/SimulationPanel'
import type { LeagueRosterCard } from '@/components/league/types'
import type { SimPlayerInput, SimTeamInput } from '@/lib/ai/sim/types'

function rosterToSimPlayers(roster: LeagueRosterCard): SimPlayerInput[] {
  const out: SimPlayerInput[] = []
  let i = 0
  for (const sec of roster.sections) {
    for (const slot of sec.items) {
      const p = slot.player
      const base =
        typeof p.score === 'number' && !Number.isNaN(p.score)
          ? Math.min(32, Math.max(4, p.score))
          : 8.5 + (i % 9) * 0.45
      const variance = 6 + (typeof p.trendValue === 'number' ? Math.min(4, Math.abs(p.trendValue) * 0.12) : 0)
      out.push({
        id: p.id,
        name: p.name,
        position: p.position?.trim() || 'FLEX',
        projection: base,
        variance,
        consistency:
          typeof p.startPercent === 'number' ? Math.min(0.92, 0.38 + Math.min(1, p.startPercent / 100) * 0.45) : undefined,
      })
      i++
    }
  }
  return out
}

function syntheticTeam(id: string, meanProj: number, seed: number): SimTeamInput {
  const roster: SimPlayerInput[] = Array.from({ length: 9 }, (_, k) => ({
    id: `${id}-${seed}-${k}`,
    position: 'FLEX',
    projection: Math.max(4, meanProj * (0.92 + (k % 5) * 0.02)),
    variance: 7,
  }))
  return { id, roster }
}

export function TeamSeasonSimPanel({ roster, leagueSize }: { roster: LeagueRosterCard; leagueSize: number }) {
  const requestBody = useMemo(() => {
    const myPlayers = rosterToSimPlayers(roster)
    const tid = roster.teamId ?? 'my-team'
    const myTeam: SimTeamInput = {
      id: tid,
      name: roster.teamName,
      roster: myPlayers.length ? myPlayers : [{ id: 'placeholder', position: 'FLEX', projection: 8, variance: 7 }],
    }

    const n = Math.max(2, Math.min(32, leagueSize))
    const rest = n - 1
    const fill: SimTeamInput[] = []
    for (let j = 0; j < rest; j++) {
      fill.push(syntheticTeam(`lg-${j}`, 8.2 + (j % 5) * 0.15, j))
    }

    const teams = [myTeam, ...fill]
    return {
      kind: 'season' as const,
      iterations: 180,
      teams,
      weeksRemaining: 12,
      playoffTeams: Math.min(6, n),
      seed: 42,
    }
  }, [roster, leagueSize])

  return (
    <SimulationPanel
      title="Sim season"
      description="Monte Carlo rest-of-season using your roster rows and synthetic opponents — quick odds, not a precision accounting of your exact schedule."
      requestBody={requestBody}
      className="mt-4"
    />
  )
}
