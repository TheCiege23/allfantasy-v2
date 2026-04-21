import type { KeeperConfig } from '@/lib/live-draft-engine/keeper/types'
import type { Prisma } from '@prisma/client'

function num(v: unknown, fallback: number): number {
  if (v === undefined || v === null) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function str(v: unknown, fallback: string): string {
  if (v === undefined || v === null || v === '') return fallback
  return String(v)
}

/**
 * Maps wizard / API payload fields onto Prisma `League` keeper columns and `DraftSession.keeperConfig`.
 * Used by canonical create and legacy POST /api/league/create for keeper leagues.
 */
export function mapKeeperCreationFromWizard(args: {
  draftType: string
  settings: Record<string, unknown>
  keeperSettings?: Record<string, unknown> | null
  conceptSetup?: Record<string, unknown> | null
}): {
  league: Partial<Prisma.LeagueUncheckedCreateInput>
  draftKeeperConfig: KeeperConfig
} {
  const ks = args.keeperSettings && typeof args.keeperSettings === 'object' ? args.keeperSettings : {}
  const cs = args.conceptSetup && typeof args.conceptSetup === 'object' ? args.conceptSetup : {}
  const merged: Record<string, unknown> = { ...args.settings, ...ks, ...cs }

  const maxKeepers = Math.max(
    0,
    Math.min(
      32,
      num(
        merged.keeper_max_keepers ??
          merged.keeperMaxKeepers ??
          merged.max_keepers ??
          merged.keeperCount,
        3,
      ),
    ),
  )

  const dt = String(args.draftType).toLowerCase()
  const isAuction = dt.includes('auction')
  const costSystem = str(
    merged.keeper_cost_system ?? merged.keeperCostSystem,
    isAuction ? 'auction_value' : 'round_based',
  )

  const waiverAllowed =
    merged.keeper_waiver_allowed === false || merged.keeperWaiverAllowed === false ? false : true

  const eligibilityRule = str(
    merged.keeper_eligibility_rule ?? merged.keeperEligibilityRule,
    'any',
  )

  const maxYears = Math.max(0, Math.min(20, num(merged.keeper_max_years ?? merged.keeperMaxYears, 3)))
  const roundPenalty = Math.max(0, Math.min(10, num(merged.keeper_round_penalty ?? merged.keeperRoundPenalty, 1)))
  const auctionPct = num(merged.keeper_auction_pct_increase ?? merged.keeperAuctionPctIncrease, 0.2)

  let deadline: Date | undefined
  const rawDeadline =
    merged.keeper_declaration_deadline ??
    merged.keeperSelectionDeadline ??
    merged.keeper_selection_deadline
  if (typeof rawDeadline === 'string' && rawDeadline.trim()) {
    const d = new Date(rawDeadline)
    if (!Number.isNaN(d.getTime())) deadline = d
  }

  let maxPerPos: Record<string, number> | undefined
  const rawPos = merged.keeper_max_per_position ?? merged.maxKeepersPerPosition
  if (rawPos && typeof rawPos === 'object' && !Array.isArray(rawPos)) {
    const o: Record<string, number> = {}
    for (const [k, v] of Object.entries(rawPos as Record<string, unknown>)) {
      const n = Number(v)
      if (Number.isFinite(n) && n >= 0) o[k.toUpperCase()] = Math.floor(n)
    }
    if (Object.keys(o).length > 0) maxPerPos = o
  }

  const league: Partial<Prisma.LeagueUncheckedCreateInput> = {
    keeperCount: maxKeepers,
    keeperCostSystem: costSystem,
    keeperMaxYears: maxYears,
    keeperWaiverAllowed: waiverAllowed,
    keeperEligibilityRule: eligibilityRule,
    keeperRoundPenalty: roundPenalty,
    keeperAuctionPctIncrease: auctionPct,
    keeperConflictRule: str(merged.keeper_conflict_rule ?? merged.keeperConflictRule, 'player_chooses'),
    keeperMissedDeadlineRule: str(
      merged.keeper_missed_deadline_rule ?? merged.keeperMissedDeadlineRule,
      'auto_no_keepers',
    ),
    ...(deadline ? { keeperSelectionDeadline: deadline } : {}),
  }

  const draftKeeperConfig: KeeperConfig = {
    maxKeepers,
    ...(deadline ? { deadline: deadline.toISOString() } : {}),
    ...(maxPerPos ? { maxKeepersPerPosition: maxPerPos } : {}),
  }

  return { league, draftKeeperConfig }
}
