import { prisma } from '@/lib/prisma'
import { getDynastySportConfig } from './dynastySportConfig'

/**
 * Dynasty league offseason phase engine.
 * Manages the transition between season phases and enforces
 * roster action locks based on the current phase.
 */

export type DynastyPhase =
  | 'in_season'
  | 'post_season'
  | 'offseason_open'
  | 'free_agency'
  | 'rookie_draft_window'
  | 'roster_cuts'
  | 'preseason'

export type PhaseConfig = {
  phase: DynastyPhase
  label: string
  description: string
  allowTrades: boolean
  allowWaivers: boolean
  allowLineupChanges: boolean
  allowTaxiMoves: boolean
  allowDevyMoves: boolean
  allowDrops: boolean
  allowPickTrades: boolean
  enforceRosterLimits: boolean
}

const PHASE_CONFIGS: Record<DynastyPhase, PhaseConfig> = {
  in_season: {
    phase: 'in_season',
    label: 'Regular Season',
    description: 'Active season. Full roster management available.',
    allowTrades: true,
    allowWaivers: true,
    allowLineupChanges: true,
    allowTaxiMoves: true,
    allowDevyMoves: false,
    allowDrops: true,
    allowPickTrades: true,
    enforceRosterLimits: true,
  },
  post_season: {
    phase: 'post_season',
    label: 'Playoffs',
    description: 'Playoff period. Limited roster moves.',
    allowTrades: false,
    allowWaivers: true,
    allowLineupChanges: true,
    allowTaxiMoves: false,
    allowDevyMoves: false,
    allowDrops: false,
    allowPickTrades: false,
    enforceRosterLimits: true,
  },
  offseason_open: {
    phase: 'offseason_open',
    label: 'Offseason',
    description: 'Season complete. Trades and roster evaluation open.',
    allowTrades: true,
    allowWaivers: false,
    allowLineupChanges: false,
    allowTaxiMoves: true,
    allowDevyMoves: true,
    allowDrops: true,
    allowPickTrades: true,
    enforceRosterLimits: false,
  },
  free_agency: {
    phase: 'free_agency',
    label: 'Free Agency',
    description: 'Free agent acquisition period.',
    allowTrades: true,
    allowWaivers: true,
    allowLineupChanges: false,
    allowTaxiMoves: true,
    allowDevyMoves: true,
    allowDrops: true,
    allowPickTrades: true,
    enforceRosterLimits: false,
  },
  rookie_draft_window: {
    phase: 'rookie_draft_window',
    label: 'Rookie Draft',
    description: 'Annual rookie/devy draft period. Pick trades allowed.',
    allowTrades: true,
    allowWaivers: false,
    allowLineupChanges: false,
    allowTaxiMoves: false,
    allowDevyMoves: false,
    allowDrops: true,
    allowPickTrades: true,
    enforceRosterLimits: false,
  },
  roster_cuts: {
    phase: 'roster_cuts',
    label: 'Roster Cuts',
    description: 'Trim rosters to legal limits before season start.',
    allowTrades: true,
    allowWaivers: false,
    allowLineupChanges: false,
    allowTaxiMoves: true,
    allowDevyMoves: true,
    allowDrops: true,
    allowPickTrades: true,
    enforceRosterLimits: true,
  },
  preseason: {
    phase: 'preseason',
    label: 'Preseason',
    description: 'Final roster adjustments before regular season.',
    allowTrades: true,
    allowWaivers: true,
    allowLineupChanges: true,
    allowTaxiMoves: true,
    allowDevyMoves: false,
    allowDrops: true,
    allowPickTrades: true,
    enforceRosterLimits: true,
  },
}

export function getPhaseConfig(phase: DynastyPhase): PhaseConfig {
  return PHASE_CONFIGS[phase]
}

/**
 * Determine the current dynasty phase for a league.
 */
export async function getCurrentDynastyPhase(leagueId: string): Promise<{
  phase: DynastyPhase
  config: PhaseConfig
  sport: string
}> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sport: true, settings: true, status: true },
  })
  if (!league) throw new Error('League not found')

  const settings = (league.settings ?? {}) as Record<string, unknown>
  const currentPhase = (settings.dynasty_phase as DynastyPhase) ?? 'in_season'

  return {
    phase: currentPhase,
    config: getPhaseConfig(currentPhase),
    sport: league.sport ?? 'NFL',
  }
}

/**
 * Transition a dynasty league to a new phase.
 * Updates the league settings and creates an audit entry.
 */
export async function transitionDynastyPhase(
  leagueId: string,
  newPhase: DynastyPhase,
  reason?: string,
): Promise<void> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  if (!league) throw new Error('League not found')

  const settings = (league.settings ?? {}) as Record<string, unknown>
  const prevPhase = (settings.dynasty_phase as string) ?? 'in_season'

  await prisma.league.update({
    where: { id: leagueId },
    data: {
      settings: {
        ...settings,
        dynasty_phase: newPhase,
        dynasty_phase_changed_at: new Date().toISOString(),
        dynasty_previous_phase: prevPhase,
      },
    },
  })
}

/**
 * Check if a roster action is allowed in the current dynasty phase.
 */
export async function isDynastyActionAllowed(
  leagueId: string,
  action: 'trade' | 'waiver' | 'lineup' | 'taxi' | 'devy' | 'drop' | 'pick_trade',
): Promise<{ allowed: boolean; reason?: string }> {
  const { phase, config } = await getCurrentDynastyPhase(leagueId)

  const actionMap: Record<string, keyof PhaseConfig> = {
    trade: 'allowTrades',
    waiver: 'allowWaivers',
    lineup: 'allowLineupChanges',
    taxi: 'allowTaxiMoves',
    devy: 'allowDevyMoves',
    drop: 'allowDrops',
    pick_trade: 'allowPickTrades',
  }

  const field = actionMap[action]
  if (!field) return { allowed: true }

  const allowed = config[field] as boolean
  if (!allowed) {
    return {
      allowed: false,
      reason: `${action.replace('_', ' ')} is not allowed during the ${config.label} phase.`,
    }
  }
  return { allowed: true }
}

/**
 * Generate the standard offseason phase sequence for a dynasty league.
 */
export function getDynastyOffseasonSequence(sport: string): DynastyPhase[] {
  const cfg = getDynastySportConfig(sport)
  const phases: DynastyPhase[] = [
    'post_season',
    'offseason_open',
    'free_agency',
    'rookie_draft_window',
    'roster_cuts',
    'preseason',
    'in_season',
  ]
  return phases
}

/**
 * Auto-advance to next phase if conditions are met.
 */
export async function tryAdvanceDynastyPhase(leagueId: string): Promise<{
  advanced: boolean
  newPhase?: DynastyPhase
}> {
  const { phase, sport } = await getCurrentDynastyPhase(leagueId)
  const sequence = getDynastyOffseasonSequence(sport)
  const idx = sequence.indexOf(phase)

  if (idx < 0 || idx >= sequence.length - 1) {
    return { advanced: false }
  }

  const nextPhase = sequence[idx + 1]
  await transitionDynastyPhase(leagueId, nextPhase, 'Auto-advanced by offseason engine')
  return { advanced: true, newPhase: nextPhase }
}
