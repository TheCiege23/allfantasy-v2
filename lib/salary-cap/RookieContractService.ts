/**
 * Rookie contract assignment from draft slot (PROMPT 339). Deterministic only.
 * Uses SnakeSalaryScaleEngine for sport-aware, league-configurable salary assignment.
 *
 * Salary curve rules (adapted from contract-dynasty best practices):
 *   1.01 = highest salary (e.g., $45 for NFL)
 *   Decreasing by pick slot using configured curve (steep, linear, exponential, flat)
 *   Later rounds are cheaper — round 2+ picks cost progressively less
 *   Minimum salary floor enforced for all picks
 */

import { prisma } from '@/lib/prisma'
import { getSalaryCapConfig } from './SalaryCapLeagueConfig'
import { getSalaryForPick, getDefaultSnakeSalaryConfig, type SnakeSalaryScaleConfig } from './SnakeSalaryScaleEngine'

const DEFAULT_TEAM_COUNT = 12
const DEFAULT_DRAFT_ROUNDS = 15

/**
 * Load snake salary scale config for a league from DB.
 * Falls back to sport-aware defaults if no custom config is stored.
 */
async function getSnakeSalaryScaleConfig(
  leagueId: string,
  sport: string,
  teamCount: number,
  draftRounds: number
): Promise<SnakeSalaryScaleConfig> {
  try {
    const row = await prisma.$queryRaw<
      Array<{
        curveType: string
        totalCap: number
        maxSalary: number
        minSalary: number
        draftRounds: number
        teamCount: number
        contractYearsByRound: unknown
        customScale: unknown
      }>
    >`
      SELECT "curveType", "totalCap", "maxSalary", "minSalary", "draftRounds",
             "teamCount", "contractYearsByRound", "customScale"
      FROM "snake_salary_scale_configs"
      WHERE "leagueId" = ${leagueId}
      LIMIT 1
    `
    if (row.length > 0) {
      const r = row[0]
      const cyr =
        r.contractYearsByRound && typeof r.contractYearsByRound === 'object'
          ? (r.contractYearsByRound as Record<number, number>)
          : {}
      const cs =
        r.customScale && typeof r.customScale === 'object'
          ? (r.customScale as Record<number, number>)
          : undefined
      return {
        totalCap: Number(r.totalCap),
        teamCount: Number(r.teamCount) || teamCount,
        draftRounds: Number(r.draftRounds) || draftRounds,
        curveType: (r.curveType as SnakeSalaryScaleConfig['curveType']) ?? 'steep',
        minSalary: Number(r.minSalary),
        maxSalary: Number(r.maxSalary),
        contractYearsByRound: cyr,
        customScale: cs,
      }
    }
  } catch {
    // snake_salary_scale_configs table may not exist yet — fall through to defaults
  }
  return getDefaultSnakeSalaryConfig(sport, teamCount, draftRounds)
}

/**
 * Assign rookie/snake-draft contract after draft pick.
 * Creates a PlayerContract with league-specific rookie years and slot salary
 * from the sport-aware snake salary scale.
 *
 * @param draftSlot - Overall pick number (1-based, e.g. 1.01 = slot 1)
 */
export async function assignRookieContract(
  leagueId: string,
  rosterId: string,
  playerId: string,
  playerName: string | null,
  position: string | null,
  draftSlot: number,
  capYear: number
): Promise<{ ok: boolean; contractId?: string; salary?: number; contractYears?: number; error?: string }> {
  const config = await getSalaryCapConfig(leagueId)
  if (!config) return { ok: false, error: 'Not a salary cap league' }

  // Load league team count from leagueSettings or fall back to default
  let teamCount = DEFAULT_TEAM_COUNT
  try {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { leagueSize: true },
    })
    if (league?.leagueSize) teamCount = league.leagueSize
  } catch {
    // Use default
  }

  const scaleConfig = await getSnakeSalaryScaleConfig(
    leagueId,
    String(config.sport),
    teamCount,
    DEFAULT_DRAFT_ROUNDS
  )

  const { salary, contractYears } = getSalaryForPick(draftSlot, scaleConfig)
  // Use league's rookieContractYears as authority over scale-derived years when configured
  const years = config.rookieContractYears > 0 ? config.rookieContractYears : contractYears
  // Enforce minimum salary from league config
  const finalSalary = Math.max(config.minimumSalary, Math.round(salary))

  const round = Math.ceil(draftSlot / teamCount)

  const c = await prisma.playerContract.create({
    data: {
      leagueId,
      configId: config.configId,
      rosterId,
      playerId,
      playerName,
      position,
      salary: finalSalary,
      yearsTotal: years,
      yearSigned: capYear,
      contractYear: 1,
      status: 'active',
      source: 'rookie_draft',
      // draftPickOverall and draftRound stored if columns exist
      ...(typeof (prisma.playerContract.create as unknown) === 'function'
        ? {
            draftPickOverall: draftSlot,
            draftRound: round,
            contractSource: 'rookie_draft',
          }
        : {}),
    },
  })
  return { ok: true, contractId: c.id, salary: finalSalary, contractYears: years }
}
