import type { SportConfig } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { calculateOfficialTeamScore, leagueUsesDevyEngine } from '@/lib/devy/scoringEligibilityEngine'
import { leagueUsesC2CEngine, updateC2CMatchupScores } from '@/lib/c2c/scoringEngine'
import {
  expandSportConfigToggles,
  getScoringCategories,
  resolveSportConfigKey,
  tryGetSportConfig,
} from '@/lib/sportConfig'
import type { ScoringCategory } from '@/lib/sportConfig/types'
import type { StatCategoryRow } from './types'

export function calculateFantasyPoints(
  rawStats: Record<string, number>,
  statCategories: SportConfig['statCategories'],
  scoringOverrides?: Record<string, number>,
): number {
  const cats = statCategories as unknown as StatCategoryRow[]
  if (!Array.isArray(cats)) return 0
  let sum = 0
  for (const cat of cats) {
    const v = rawStats[cat.key] ?? 0
    const mult = scoringOverrides?.[cat.key] ?? cat.points
    sum += v * mult
  }
  return sum
}

function bonusBaseYardsKey(catKey: string): string | null {
  if (catKey.includes('pass_') && catKey.includes('bonus')) return 'pass_yds'
  if (catKey.includes('rush_') && catKey.includes('bonus')) return 'rush_yds'
  if (catKey.includes('rec_') && catKey.includes('bonus')) return 'rec_yds'
  return null
}

function pointsForCategory(cat: ScoringCategory, rawStats: Record<string, number>): number {
  const pts = cat.defaultPoints
  if (cat.minForBonus != null) {
    const base = bonusBaseYardsKey(cat.key)
    if (!base) return 0
    const yards = rawStats[base] ?? 0
    return yards >= cat.minForBonus ? pts : 0
  }
  const raw = rawStats[cat.key] ?? 0
  if (cat.unit === 'per_yard' || cat.unit === 'per_inning') {
    return raw * pts
  }
  return raw * pts
}

function applyScoringPresetToRecPoints(
  categories: ScoringCategory[],
  preset: string,
  overrides: Record<string, number>,
): ScoringCategory[] {
  if (overrides.rec != null) return categories
  if (preset === 'CUSTOM') return categories
  const recPts =
    preset === 'PPR' ? 1 : preset === 'HALF_PPR' ? 0.5 : preset === 'STANDARD' ? 0 : null
  if (recPts === null) return categories
  return categories.map((c) => (c.key === 'rec' ? { ...c, defaultPoints: recPts } : c))
}

type SportConfigBlob = Record<string, unknown>

function readSportConfig(league: { settings: unknown }): SportConfigBlob {
  const s = league.settings as Record<string, unknown> | null | undefined
  const raw = s?.sportConfig
  return raw && typeof raw === 'object' && raw !== null ? (raw as SportConfigBlob) : {}
}

function togglesFromSportConfig(sc: SportConfigBlob): string[] {
  const t: string[] = []
  if (sc.enableIDP === true) t.push('IDP')
  if (sc.enableSuperflex === true) t.push('SUPERFLEX')
  if (sc.enableTEPremium === true) t.push('TE_PREMIUM')
  return t
}

/**
 * Config-driven fantasy points from raw weekly stats — uses SportConfig + league `settings.sportConfig` overrides.
 */
export async function calculateScoreFromSportConfig(
  leagueId: string,
  _playerId: string,
  _week: number,
  rawStats: Record<string, number>,
): Promise<number> {
  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    select: { sport: true, settings: true },
  })
  if (!league) return 0

  const sport = resolveSportConfigKey(String(league.sport))
  const cfg = tryGetSportConfig(sport)
  if (!cfg) return calculateFantasyPoints(rawStats, [] as unknown as SportConfig['statCategories'], undefined)

  const sc = readSportConfig(league)
  const toggles = togglesFromSportConfig(sc)
  const expanded = expandSportConfigToggles(toggles)
  let categories = getScoringCategories(cfg.sport, expanded)
  const preset = String(sc.scoringPreset ?? 'PPR')
  const overrides =
    typeof sc.categoryPoints === 'object' && sc.categoryPoints !== null
      ? (sc.categoryPoints as Record<string, number>)
      : {}
  categories = applyScoringPresetToRecPoints(categories, preset, overrides)

  let sum = 0
  for (const cat of categories) {
    const mult = overrides[cat.key] ?? cat.defaultPoints
    const c = { ...cat, defaultPoints: mult }
    sum += pointsForCategory(c, rawStats)
  }
  return sum
}

export async function updateMatchupScores(matchupId: string): Promise<void> {
  const m = await prisma.redraftMatchup.findFirst({
    where: { id: matchupId },
    include: {
      homeRoster: { include: { players: true } },
      awayRoster: { include: { players: true } },
    },
  })
  if (!m || !m.homeRoster || !m.awayRosterId) return

  if (await leagueUsesC2CEngine(m.leagueId)) {
    await updateC2CMatchupScores(matchupId)
    return
  }

  const week = m.week
  const season = await prisma.redraftSeason.findFirst({ where: { id: m.seasonId } })
  if (!season) return

  const useDevyEngine = await leagueUsesDevyEngine(m.leagueId)

  async function sumStarters(rosterId: string): Promise<number> {
    if (useDevyEngine) {
      const r = await calculateOfficialTeamScore(m.leagueId, rosterId, week, season.season)
      return r.officialScore
    }
    const starters = await prisma.redraftRosterPlayer.findMany({
      where: {
        rosterId,
        droppedAt: null,
        slotType: { notIn: ['bench', 'taxi', 'devy'] },
      },
    })
    let pts = 0
    for (const p of starters) {
      const row = await prisma.playerWeeklyScore.findUnique({
        where: {
          playerId_week_season_sport: {
            playerId: p.playerId,
            week,
            season: season.season,
            sport: p.sport,
          },
        },
      })
      pts += row?.fantasyPts ?? 0
    }
    return pts
  }

  const homePts = await sumStarters(m.homeRosterId)
  const awayPts = await sumStarters(m.awayRosterId)

  await prisma.redraftMatchup.update({
    where: { id: matchupId },
    data: {
      homeScore: homePts,
      awayScore: awayPts,
      status: 'active',
    },
  })
}

export async function lockPlayersAtGameStart(_sport: string, _week: number): Promise<void> {
  // Placeholder: wire to live stats provider (Rolling Insights / sport APIs).
}
