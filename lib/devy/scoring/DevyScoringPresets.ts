/**
 * PROMPT 4: Devy Dynasty scoring presets. Wires into existing scoring architecture (ScoringDefaultsRegistry).
 * NFL: Half-PPR (default), Full PPR, TE premium, Superflex; best ball compatible; dynasty only.
 * NBA: Points league default; best ball compatible; dynasty only.
 */

import type { LeagueSport } from '@prisma/client'

export interface DevyScoringPreset {
  id: string
  name: string
  description: string
  /** Key for ScoringDefaultsRegistry or league settings (e.g. NFL-Half PPR, NBA-points). */
  scoringTemplateId: string
  sport: LeagueSport
  bestBallCompatible: boolean
  dynastyOnly: boolean
}

const NFL_PRESETS: DevyScoringPreset[] = [
  {
    id: 'nfl_devy_half_ppr',
    name: 'Half-PPR',
    description: 'Default. 0.5 PPR; best ball compatible.',
    scoringTemplateId: 'NFL-Half PPR',
    sport: 'NFL',
    bestBallCompatible: true,
    dynastyOnly: true,
  },
  {
    id: 'nfl_devy_full_ppr',
    name: 'Full PPR',
    description: '1 PPR; best ball compatible.',
    scoringTemplateId: 'NFL-PPR',
    sport: 'NFL',
    bestBallCompatible: true,
    dynastyOnly: true,
  },
  {
    id: 'nfl_devy_te_premium',
    name: 'TE Premium',
    description: 'PPR with TE reception bonus; best ball compatible.',
    scoringTemplateId: 'NFL-PPR',
    sport: 'NFL',
    bestBallCompatible: true,
    dynastyOnly: true,
  },
  {
    id: 'nfl_devy_superflex',
    name: 'Superflex',
    description: 'Superflex slot; use with Half or Full PPR.',
    scoringTemplateId: 'NFL-Half PPR',
    sport: 'NFL',
    bestBallCompatible: true,
    dynastyOnly: true,
  },
]

const NBA_PRESETS: DevyScoringPreset[] = [
  {
    id: 'nba_devy_points',
    name: 'Points League',
    description: 'Default. Points for pts, reb, ast, stl, blk, 3PM; best ball compatible.',
    scoringTemplateId: 'NBA-points',
    sport: 'NBA',
    bestBallCompatible: true,
    dynastyOnly: true,
  },
]

export function getDevyScoringPresets(sport: LeagueSport): DevyScoringPreset[] {
  if (sport === 'NFL') return NFL_PRESETS
  if (sport === 'NBA') return NBA_PRESETS
  return []
}

export function getDevyScoringPresetById(id: string): DevyScoringPreset | null {
  const all = [...NFL_PRESETS, ...NBA_PRESETS]
  return all.find((p) => p.id === id) ?? null
}
