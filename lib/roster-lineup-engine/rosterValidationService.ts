/**
 * Authoritative roster / lineup validation against league template + IR/taxi/devy rules.
 */
import {
  getNormalizedLineupSections,
  normalizePositionForStarterEligibility,
  validateRosterSectionsAgainstTemplate,
  getSlotLimitsFromTemplate,
} from '@/lib/roster/LineupTemplateValidation'
import type { RosterTemplateDto } from '@/lib/multi-sport/RosterTemplateService'
import type { LineupValidationContext, RosterValidationIssue, RosterValidationResult } from './types'
import { ROSTER_SECTION_KEYS, type RosterSectionKey } from './types'
import { resolveConceptRosterLineupRules } from './conceptRosterRules'

function playerStatusUpper(row: Record<string, unknown>): string {
  const s = String(row.status ?? row.injury_status ?? '').trim().toUpperCase()
  return s
}

function isIrEligibleForLeague(
  league: LineupValidationContext['league'],
  status: string,
): boolean {
  const st = status
  if (['IR', 'PUP', 'OUT_IR', 'RESERVE'].includes(st)) return true
  if (st === 'OUT' && league.irAllowOut) return true
  if (['COVID', 'COVID-19'].includes(st) && league.irAllowCovid) return true
  if (['SUSP', 'SUSPENDED'].includes(st) && league.irAllowSuspended) return true
  if (st === 'N/A' && league.irAllowNA) return true
  if (['DNR', 'DID_NOT_REPORT'].includes(st) && league.irAllowDNR) return true
  if (['Q', 'QUESTIONABLE', 'DOUBTFUL', 'D'].includes(st) && league.irAllowDoubtful) return true
  return st === 'IR'
}

export function collectDuplicatePlayerIssues(playerData: unknown): RosterValidationIssue[] {
  const sections = getNormalizedLineupSections(playerData)
  const seen = new Map<string, RosterSectionKey>()
  const issues: RosterValidationIssue[] = []
  for (const section of ROSTER_SECTION_KEYS) {
    for (const row of sections[section]) {
      const id = String((row as Record<string, unknown>).id ?? '').trim()
      if (!id) continue
      if (seen.has(id)) {
        issues.push({
          code: 'duplicate_player',
          message: `Player ${id} appears more than once on this roster.`,
          section,
          playerId: id,
        })
      } else {
        seen.set(id, section)
      }
    }
  }
  return issues
}

export function validateIrSectionAgainstLeague(
  league: LineupValidationContext['league'],
  playerData: unknown,
): RosterValidationIssue[] {
  const sections = getNormalizedLineupSections(playerData)
  const issues: RosterValidationIssue[] = []
  for (const row of sections.ir) {
    const o = row as Record<string, unknown>
    const id = String(o.id ?? '')
    const st = playerStatusUpper(o)
    if (!isIrEligibleForLeague(league, st)) {
      issues.push({
        code: 'ir_ineligible_status',
        message: `Player ${id} is not eligible for IR with current injury/status rules.`,
        section: 'ir',
        playerId: id,
      })
    }
  }
  return issues
}

export function validateLifecycleAllowsLineup(lifecycle: string): RosterValidationIssue[] {
  const v = String(lifecycle)
  if (v === 'archived' || v === 'completed') {
    return [
      {
        code: 'lifecycle_locked',
        message: 'League is no longer active; lineup changes are disabled.',
      },
    ]
  }
  return []
}

export function validateRosterPlayerDataAgainstTemplate(
  playerData: unknown,
  template: RosterTemplateDto,
): string | null {
  return validateRosterSectionsAgainstTemplate(playerData, template)
}

/**
 * Full validation pipeline for persisted `Roster.playerData` shape.
 */
export function validateCanonicalRosterPayload(
  playerData: unknown,
  ctx: LineupValidationContext,
): RosterValidationResult {
  const issues: RosterValidationIssue[] = []

  issues.push(...validateLifecycleAllowsLineup(String(ctx.league.lifecycleState)))
  if (ctx.league.lockAllMoves) {
    issues.push({ code: 'league_lock_all', message: 'Commissioner has locked all roster moves for this league.' })
  }

  const concept = resolveConceptRosterLineupRules(ctx.league.settings)
  if (!concept.allowLineupEdits) {
    issues.push({
      code: 'concept_lineup_frozen',
      message: 'Lineup edits are disabled for this league phase or concept.',
    })
  }
  if (!concept.allowIrMoves) {
    const sections = getNormalizedLineupSections(playerData)
    if (sections.ir.length > 0) {
      issues.push({
        code: 'concept_ir_blocked',
        message: 'IR moves are not allowed under current specialty rules.',
      })
    }
  }
  if (!concept.allowDevySlots) {
    const sections = getNormalizedLineupSections(playerData)
    if (sections.devy.length > 0) {
      issues.push({
        code: 'concept_devy_blocked',
        message: 'Devy slots are not enabled for this concept.',
      })
    }
  }

  const templateErr = validateRosterPlayerDataAgainstTemplate(playerData, ctx.template)
  if (templateErr) {
    issues.push({ code: 'template_violation', message: templateErr })
  }

  issues.push(...collectDuplicatePlayerIssues(playerData))
  issues.push(...validateIrSectionAgainstLeague(ctx.league, playerData))

  const sections = getNormalizedLineupSections(playerData)
  if ((ctx.league.taxiSlots ?? 0) <= 0 && sections.taxi.length > 0) {
    issues.push({
      code: 'taxi_disabled',
      message: 'Taxi squad is not enabled for this league.',
      section: 'taxi',
    })
  }

  const starterAllowed = new Set(
    ctx.template.slots
      .filter((s) => s.starterCount > 0)
      .flatMap((s) => s.allowedPositions ?? [])
      .map((p) => normalizePositionForStarterEligibility(String(p))),
  )
  if (starterAllowed.size > 0 && !starterAllowed.has('*')) {
    for (const row of sections.starters) {
      const o = row as Record<string, unknown>
      const pos = normalizePositionForStarterEligibility(String(o.position ?? ''))
      if (pos && !starterAllowed.has(pos)) {
        issues.push({
          code: 'starter_position_ineligible',
          message: `Position ${pos} is not eligible for a starter slot.`,
          section: 'starters',
          playerId: String(o.id ?? ''),
        })
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  }
}
