/**
 * PROMPT 4: C2C scoring presets. Wires into existing scoring architecture (ScoringDefaultsRegistry).
 * NFL: Half-PPR default, Full PPR, TE premium, Superflex; best ball compatible; dynasty only.
 * NBA: Points-based default; best ball compatible; dynasty only.
 */

import type { LeagueSport } from '@prisma/client'

export interface C2CScoringPreset {
  id: string
  name: string
  description: string
  scoringTemplateId: string
  sport: LeagueSport
  bestBallCompatible: boolean
  dynastyOnly: boolean
}

const NFL_PRESETS: C2CScoringPreset[] = [
  {
    id: 'nfl_c2c_half_ppr',
    name: 'Half-PPR',
    description: 'Default. 0.5 PPR; best ball compatible.',
    scoringTemplateId: 'NFL-Half PPR',
    sport: 'NFL',
    bestBallCompatible: true,
    dynastyOnly: true,
  },
  {
    id: 'nfl_c2c_full_ppr',
    name: 'Full PPR',
    description: '1 PPR; best ball compatible.',
    scoringTemplateId: 'NFL-PPR',
    sport: 'NFL',
    bestBallCompatible: true,
    dynastyOnly: true,
  },
  {
    id: 'nfl_c2c_te_premium',
    name: 'TE Premium',
    description: 'PPR with TE reception bonus; best ball compatible.',
    scoringTemplateId: 'NFL-PPR',
    sport: 'NFL',
    bestBallCompatible: true,
    dynastyOnly: true,
  },
  {
    id: 'nfl_c2c_superflex',
    name: 'Superflex',
    description: 'Superflex slot; use with Half or Full PPR.',
    scoringTemplateId: 'NFL-Half PPR',
    sport: 'NFL',
    bestBallCompatible: true,
    dynastyOnly: true,
  },
]

const NBA_PRESETS: C2CScoringPreset[] = [
  {
    id: 'nba_c2c_points',
    name: 'Points League',
    description: 'Default. Points for pts, reb, ast, stl, blk, 3PM; best ball compatible.',
    scoringTemplateId: 'NBA-points',
    sport: 'NBA',
    bestBallCompatible: true,
    dynastyOnly: true,
  },
]

export function getC2CScoringPresets(sport: LeagueSport): C2CScoringPreset[] {
  if (sport === 'NFL') return NFL_PRESETS
  if (sport === 'NBA') return NBA_PRESETS
  return []
}

export function getC2CScoringPresetById(id: string): C2CScoringPreset | null {
  const all = [...NFL_PRESETS, ...NBA_PRESETS]
  return all.find((p) => p.id === id) ?? null
}
