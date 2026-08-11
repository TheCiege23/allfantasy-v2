import { describe, expect, it } from 'vitest'

import { buildAfProjection } from '@/lib/af-projections/buildAfProjection'
import {
  MEASURED_SOLO_TACKLE_SHARE,
  extractIdpComponents,
  scoreIdpComponents,
} from '@/lib/af-projections/idpScoring'

/** Real shape of the `balanced` preset, including the disagreeing aliases. */
const BALANCED = {
  idp_solo_tackle: 1,
  idp_tackle_solo: 1,
  idp_assist_tackle: 0.5,
  idp_tackle_assist: 0.5,
  idp_assisted_tackle: 0.5,
  idp_sack: 4,
  idp_interception: 3,
  idp_pass_defended: 1,
  idp_forced_fumble: 2,
  idp_fumble_forced: 3,
  idp_fumble_recovery: 2,
}

describe('extractIdpComponents', () => {
  it('reads the Sleeper weekly vocabulary and keeps the combined count separate', () => {
    const { components, combinedTackles } = extractIdpComponents(
      { idp_tkl_solo: 6, idp_tkl_ast: 3, idp_sack: 1, idp_tkl: 9 },
      'sleeper_weekly',
    )
    expect(components).toEqual({ soloTackle: 6, assistTackle: 3, sack: 1 })
    expect(combinedTackles).toBe(9)
  })

  it('reads the RI season vocabulary', () => {
    const { components, combinedTackles } = extractIdpComponents(
      { tackles: 94, sacks: 2, interceptions: 3 },
      'ri_season',
    )
    expect(components).toEqual({ sack: 2, interception: 3 })
    expect(combinedTackles).toBe(94)
  })
})

describe('scoreIdpComponents', () => {
  it('does NOT double-count aliases whose preset values disagree', () => {
    // idp_forced_fumble=2 and idp_fumble_forced=3 both exist. Summing every matching rule
    // key would award 5 per forced fumble and inflate every linebacker.
    const r = scoreIdpComponents({ components: { forcedFumble: 1 }, rules: BALANCED })!
    expect(r.points).toBe(2)
  })

  it('uses the real split when present and does not apply the prior', () => {
    const r = scoreIdpComponents({
      components: { soloTackle: 6, assistTackle: 4 },
      combinedTackles: 10,
      rules: BALANCED,
    })!
    expect(r.points).toBe(6 * 1 + 4 * 0.5)
    expect(r.usedMeasuredTackleSplit).toBe(false)
    expect(r.approximations).toEqual([])
  })

  it('apportions a combined count only when no split exists, and says so', () => {
    const r = scoreIdpComponents({ components: {}, combinedTackles: 10, rules: BALANCED })!
    const solo = 10 * MEASURED_SOLO_TACKLE_SHARE
    expect(r.points).toBeCloseTo(solo * 1 + (10 - solo) * 0.5, 2)
    expect(r.usedMeasuredTackleSplit).toBe(true)
    expect(r.approximations.join(' ')).toContain('not an observation')
  })

  it('names components the league does not score instead of dropping or defaulting them', () => {
    const r = scoreIdpComponents({
      components: { sack: 2, qbHit: 5 },
      rules: { idp_sack: 4 },
    })!
    expect(r.points).toBe(8)
    expect(r.unscoredComponents).toContain('qbHit')
  })

  it('returns null when nothing could be scored', () => {
    expect(scoreIdpComponents({ components: {}, rules: BALANCED })).toBeNull()
    expect(scoreIdpComponents({ components: { qbHit: 3 }, rules: { idp_sack: 4 } })).toBeNull()
  })
})

describe('buildAfProjection — IDP ladder', () => {
  const LB_STATS = {
    position: 'LB',
    riPlayerName: 'Test Linebacker',
    regular_season: { games_played: 16, tackles: 96, sacks: 4, interceptions: 1 },
  }

  it('projects an IDP player who has no DK points and no PPR points', () => {
    // This is the 959-player refusal case that made component scoring mandatory.
    const r = buildAfProjection({
      statsJson: LB_STATS,
      weekly: [],
      scoringFormat: 'ppr',
      basisIsPriorSeason: true,
      idpRules: BALANCED,
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.basis).toBe('season_idp_components')
      expect(r.baselineProjection).toBeGreaterThan(0)
      expect(r.idp?.usedMeasuredTackleSplit).toBe(true)
    }
  })

  it('still refuses a defender when the league does not score IDP', () => {
    // Awarding points a league would never grant is worse than refusing.
    const r = buildAfProjection({
      statsJson: LB_STATS,
      weekly: [],
      scoringFormat: 'ppr',
      basisIsPriorSeason: true,
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('no_scoring_basis')
  })

  it('prefers weekly IDP components over a recorded pts_ppr of zero', () => {
    // Sleeper records pts_ppr: 0 for many defenders. A naive "weekly wins" rule would
    // project 0.0 for a linebacker who scored real IDP points.
    const zeroPpr = {
      week: 1,
      ptsPpr: 0,
      ptsHalfPpr: 0,
      ptsStd: 0,
      offSnaps: null,
      teamOffSnaps: null,
      targets: null,
    }
    const r = buildAfProjection({
      statsJson: LB_STATS,
      weekly: [zeroPpr],
      weeklyRaw: [{ week: 1, statMap: { idp_tkl_solo: 7, idp_tkl_ast: 3, idp_sack: 1 } }],
      scoringFormat: 'ppr',
      basisIsPriorSeason: true,
      idpRules: BALANCED,
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.basis).toBe('weekly_idp_components')
      expect(r.baselineProjection).toBeCloseTo(7 * 1 + 3 * 0.5 + 1 * 4, 1)
      // Real split present, so no approximation should be claimed.
      expect(r.idp?.usedMeasuredTackleSplit).toBe(false)
    }
  })

  it('surfaces the tackle-split approximation in confidence reasons', () => {
    const r = buildAfProjection({
      statsJson: LB_STATS,
      weekly: [],
      scoringFormat: 'ppr',
      basisIsPriorSeason: true,
      idpRules: BALANCED,
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.confidence.reasons.join(' ')).toContain('measured population split')
  })

  it('never gives an offensive player an IDP projection, even with tackles on file', () => {
    // Regression: the first production run put 29 offensive players on an IDP basis,
    // including Michael Penix Jr. (QB) at 5.97 and Jayden Daniels (QB) at 3.89, entirely
    // from tackles made after turnovers. A QB must refuse, not get defensive points.
    const qb = buildAfProjection({
      statsJson: {
        position: 'QB',
        riPlayerName: 'Backup Quarterback',
        regular_season: { games_played: 10, tackles: 6, interceptions: 0 },
      },
      weekly: [],
      weeklyRaw: [{ week: 1, statMap: { idp_tkl_solo: 2, idp_tkl_ast: 1 } }],
      scoringFormat: 'ppr',
      basisIsPriorSeason: true,
      idpRules: BALANCED,
    })
    expect(qb.ok).toBe(false)
    if (!qb.ok) expect(qb.reason).toBe('no_scoring_basis')
  })

  it('excludes special-teams positions from IDP scoring', () => {
    // A long snapper makes tackles but is not IDP-rosterable; a projection for one is
    // noise in every ranking it enters.
    const ls = buildAfProjection({
      statsJson: {
        position: 'LS',
        regular_season: { games_played: 16, tackles: 8 },
      },
      weekly: [],
      scoringFormat: 'ppr',
      basisIsPriorSeason: true,
      idpRules: BALANCED,
    })
    expect(ls.ok).toBe(false)
  })

  it('keeps offensive players on the format-points basis, unaffected by IDP rules', () => {
    const wr = buildAfProjection({
      statsJson: {
        position: 'WR',
        regular_season: { games_played: 13, receptions: 50, DK_fantasy_points_per_game: 9.95 },
      },
      weekly: [],
      scoringFormat: 'ppr',
      basisIsPriorSeason: true,
      idpRules: BALANCED,
    })
    expect(wr.ok).toBe(true)
    if (wr.ok) {
      expect(wr.basis).toBe('season_dk_fppg_proxy')
      expect(wr.idp).toBeNull()
    }
  })
})
