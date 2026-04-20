import type { Prisma } from '@prisma/client'
import { parseSettingsSnapshot } from '@/lib/league-contract/types'

export type AutomationTrigger =
  | 'onWeekFinalized'
  | 'onStandingsUpdated'
  | 'onDraftCompleted'
  | 'onWaiverProcessed'
  | 'onPhaseTransition'
  | 'onManualRun'
  | 'onScheduledPass'

export type SpecialtyConceptKey =
  | 'guillotine'
  | 'survivor'
  | 'big_brother'
  | 'tournament'
  | 'zombie'
  | 'devy'
  | 'c2c'
  | 'pirate_vampire'
  | 'royal'
  | 'king_of_the_hill'
  | 'standard'

export type PlannedAction = {
  actionType: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
}

export type PlannedEvent = {
  eventType: string
  title: string
  description?: string
  payload?: Record<string, unknown>
  visibility?: 'league' | 'commissioner' | 'public'
}

export type HandlerResult = {
  summary: string
  actions: PlannedAction[]
  events: PlannedEvent[]
  phaseState?: {
    currentPhase?: string | null
    currentStage?: string | null
    currentWeekContext?: number | null
    pendingActionCount?: number
    metadata?: Record<string, unknown>
  }
  warnings?: string[]
  skipped?: boolean
  skipReason?: string
}

export type HandlerContext = {
  leagueId: string
  season: number
  week: number | null
  trigger: AutomationTrigger
  conceptKey: SpecialtyConceptKey
  /** Parsed from `settingsSnapshot.conceptRules` for handler-specific extensions (no AI). */
  conceptRules: Record<string, unknown> | null
  league: {
    id: string
    name: string | null
    sport: string
    season: number
    leagueType: string | null
    leagueVariant: string | null
    settings: Prisma.JsonValue | null
    guillotineMode: boolean | null
    survivorMode: boolean | null
    status: string | null
  }
}

export function buildIdempotencyKey(input: {
  leagueId: string
  season: number
  week: number | null
  trigger: AutomationTrigger
  conceptKey: SpecialtyConceptKey
}): string {
  const w = input.week == null ? 'na' : String(input.week)
  return `${input.leagueId}:${input.season}:${w}:${input.trigger}:${input.conceptKey}`
}

export function normalizeConceptString(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_')
}

/**
 * Single canonical concept for automation — prefers settings snapshot, then league columns.
 */
export function resolveSpecialtyConceptKey(league: {
  leagueType: string | null
  leagueVariant: string | null
  settings: Prisma.JsonValue | null
  guillotineMode: boolean | null
  survivorMode: boolean | null
}): SpecialtyConceptKey {
  const snap = parseSettingsSnapshot(league.settings)
  const fromRules = normalizeConceptString(
    (snap?.conceptRules as { concept?: string } | undefined)?.concept,
  )
  const fromType = normalizeConceptString(league.leagueType)
  const fromVariant = normalizeConceptString(league.leagueVariant)

  const candidates = [fromRules, fromType, fromVariant].filter(Boolean)

  const pick = (s: string): SpecialtyConceptKey | null => {
    if (!s || s === 'standard' || s === 'redraft' || s === 'dynasty' || s === 'keeper') return null
    if (s.includes('guillotine')) return 'guillotine'
    if (s.includes('survivor')) return 'survivor'
    if (s.includes('big_brother') || s === 'bigbrother') return 'big_brother'
    if (s.includes('tournament')) return 'tournament'
    if (s.includes('zombie')) return 'zombie'
    if (s.includes('devy')) return 'devy'
    if (s === 'c2c' || s.includes('college_to_pro') || s.includes('merged_devy')) return 'c2c'
    if (s.includes('pirate') || s.includes('vampire')) return 'pirate_vampire'
    if (s.includes('royal')) return 'royal'
    if (s.includes('king') && s.includes('hill')) return 'king_of_the_hill'
    if (s.includes('koth')) return 'king_of_the_hill'
    return null
  }

  for (const c of candidates) {
    const p = pick(c)
    if (p) return p
  }

  if (league.guillotineMode) return 'guillotine'
  if (league.survivorMode) return 'survivor'

  return 'standard'
}

export function isSpecialtyConcept(key: SpecialtyConceptKey): boolean {
  return key !== 'standard'
}
