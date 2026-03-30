/**
 * Map external draft import payload to internal preview shape. Deterministic, rules-based.
 * Resolves rosterId/displayName using league rosters and teams.
 */

import type { SlotOrderEntry } from '@/lib/live-draft-engine/types'
import type { TradedPickRecord } from '@/lib/live-draft-engine/types'
import type {
  RawDraftImportPayload,
  RawDraftOrderEntry,
  RawPickEntry,
  RawTradedPickEntry,
  RawKeeperConfig,
  RawKeeperSelection,
} from './types'
import type { DraftImportPreview, MappedPick } from './DraftImportPreview'
import type { KeeperConfig, KeeperSelection } from '@/lib/live-draft-engine/keeper/types'
import { createEmptyReport, addError, addWarning } from './ImportErrorReport'
import type { ImportErrorReport } from './types'

export interface LeagueImportContext {
  leagueId: string
  teamCount: number
  rounds: number
  /** Roster id → display name (owner or team name). */
  rosterIdToDisplayName: Record<string, string>
  /** Display name (normalized) → roster id. */
  displayNameToRosterId: Record<string, string>
  /** Ordered roster ids [slot 1, slot 2, ...] if known. */
  rosterIdsBySlot?: string[]
}

function normalizeDisplayName(s: string): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Resolve rosterId from external entry. Prefer exact rosterId; else match displayName/teamName/ownerName to league.
 */
function resolveRosterId(
  entry: RawDraftOrderEntry | RawPickEntry,
  ctx: LeagueImportContext
): string | null {
  if (entry.rosterId && ctx.rosterIdToDisplayName[entry.rosterId]) return entry.rosterId
  if (typeof entry.slot === 'number' && entry.slot >= 1 && entry.slot <= ctx.teamCount) {
    const bySlot = ctx.rosterIdsBySlot?.[entry.slot - 1]
    if (bySlot) return bySlot
  }
  const name = (entry as RawDraftOrderEntry).displayName ?? (entry as RawDraftOrderEntry).teamName ?? (entry as RawDraftOrderEntry).ownerName ?? (entry as RawPickEntry).displayName
  if (name) {
    const norm = normalizeDisplayName(name)
    const id = ctx.displayNameToRosterId[norm]
    if (id) return id
  }
  return null
}

/**
 * Map draft order to SlotOrderEntry[] using league context. Fills placeholders for unresolved.
 */
function mapDraftOrder(
  rawOrder: RawDraftOrderEntry[] | undefined,
  ctx: LeagueImportContext,
  report: ImportErrorReport
): SlotOrderEntry[] {
  const teamCount = ctx.teamCount
  const resultBySlot = new Map<number, SlotOrderEntry>()
  const usedRosterIds = new Set<string>()

  if (ctx.rosterIdsBySlot?.length) {
    for (let slot = 1; slot <= teamCount; slot += 1) {
      const rosterId = ctx.rosterIdsBySlot[slot - 1]
      if (!rosterId) continue
      resultBySlot.set(slot, {
        slot,
        rosterId,
        displayName: ctx.rosterIdToDisplayName[rosterId] ?? `Team ${slot}`,
      })
      usedRosterIds.add(rosterId)
    }
  }

  for (let i = 0; i < (rawOrder?.length ?? 0); i += 1) {
    const entry = rawOrder![i]
    const slot = Number.isInteger(entry.slot) ? Number(entry.slot) : i + 1
    if (slot < 1 || slot > teamCount) {
      addWarning(report, 'DRAFT_ORDER_SLOT_OUT_OF_RANGE', `draftOrder slot ${slot} is outside 1-${teamCount}`, `draftOrder[${i}].slot`)
      continue
    }
    const rosterId = resolveRosterId(entry, ctx) ?? `import-slot-${slot}`
    const displayName = entry.displayName ?? entry.teamName ?? entry.ownerName ?? ctx.rosterIdToDisplayName[rosterId] ?? `Team ${slot}`
    if (usedRosterIds.has(rosterId) && resultBySlot.get(slot)?.rosterId !== rosterId) {
      addWarning(report, 'DUPLICATE_ROSTER_ORDER', `Roster "${displayName}" appears more than once in draft order`, `draftOrder[${i}]`)
    }
    if (resultBySlot.has(slot)) {
      addWarning(report, 'DUPLICATE_SLOT_ORDER', `Draft order has multiple entries for slot ${slot}; latest value wins`, `draftOrder[${i}]`)
    }
    usedRosterIds.add(rosterId)
    resultBySlot.set(slot, {
      slot,
      rosterId,
      displayName,
    })
    if (rosterId.startsWith('import-slot-')) {
      addWarning(report, 'UNRESOLVED_ROSTER', `Could not resolve roster for "${displayName}"`, `draftOrder[${i}]`)
    }
  }

  const result: SlotOrderEntry[] = []
  for (let slot = 1; slot <= teamCount; slot += 1) {
    const entry = resultBySlot.get(slot)
    if (entry) {
      result.push(entry)
      continue
    }
    result.push({
      slot,
      rosterId: `import-slot-${slot}`,
      displayName: `Team ${slot}`,
    })
    addWarning(report, 'MISSING_DRAFT_ORDER_SLOT', `Draft order is missing slot ${slot}; using placeholder`, `draftOrder`)
  }
  if (rawOrder && rawOrder.length !== teamCount) {
    addWarning(report, 'DRAFT_ORDER_LENGTH', `Draft order has ${rawOrder.length} entries; expected ${teamCount}`, 'draftOrder')
  }
  return result
}

/**
 * Map raw picks to MappedPick[]. Derives round/slot/overall if missing; resolves rosterId.
 */
function mapPicks(
  rawPicks: RawPickEntry[] | undefined,
  slotOrder: SlotOrderEntry[],
  teamCount: number,
  ctx: LeagueImportContext,
  report: ImportErrorReport
): MappedPick[] {
  if (!rawPicks?.length) return []
  const picks: MappedPick[] = []
  for (let index = 0; index < rawPicks.length; index += 1) {
    const raw = rawPicks[index]
    let overall = typeof raw.overall === 'number' && Number.isFinite(raw.overall) ? Math.trunc(raw.overall) : null
    let round = typeof raw.round === 'number' && Number.isFinite(raw.round) ? Math.trunc(raw.round) : null
    let slot = typeof raw.slot === 'number' && Number.isFinite(raw.slot) ? Math.trunc(raw.slot) : null

    if (overall == null && round != null && slot != null) {
      overall = (round - 1) * teamCount + slot
    }
    if (round == null && overall != null) {
      round = Math.ceil(overall / teamCount)
    }
    if (slot == null && overall != null) {
      slot = ((overall - 1) % teamCount) + 1
    }
    if (overall == null || round == null || slot == null) {
      overall = index + 1
      round = Math.ceil(overall / teamCount)
      slot = ((overall - 1) % teamCount) + 1
      addWarning(
        report,
        'PICK_NUMBER_FALLBACK',
        `Pick "${raw.playerName}" is missing overall/round/slot; fallback numbering applied`,
        `picks[${index}]`
      )
    }
    const rosterId = resolveRosterId(raw, ctx) ?? slotOrder[slot - 1]?.rosterId ?? `import-slot-${slot}`
    const displayName = raw.displayName ?? ctx.rosterIdToDisplayName[rosterId] ?? null
    if (!raw.playerName?.trim()) {
      addError(report, 'MISSING_PLAYER_NAME', `Pick #${overall} has no player name`, `picks[${index}]`)
      continue
    }
    picks.push({
      overall,
      round,
      slot,
      rosterId,
      displayName,
      playerName: raw.playerName.trim(),
      position: (raw.position ?? '').trim() || '—',
      team: raw.team != null ? String(raw.team).trim() : null,
      byeWeek: raw.byeWeek != null ? Number(raw.byeWeek) : null,
      playerId: raw.playerId != null ? String(raw.playerId) : null,
      source: typeof raw.source === 'string' && raw.source.trim().length > 0 ? raw.source.trim() : 'import',
      amount: raw.amount != null ? Number(raw.amount) : null,
    })
  }
  return picks.sort((a, b) => a.overall - b.overall)
}

/**
 * Map traded picks to TradedPickRecord[]. Resolves roster ids.
 */
function mapTradedPicks(
  raw: RawTradedPickEntry[] | undefined,
  ctx: LeagueImportContext,
  report: ImportErrorReport
): TradedPickRecord[] {
  if (!raw?.length) return []
  const result: TradedPickRecord[] = []
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i]
    const round = Number(r.round)
    if (!Number.isFinite(round) || round < 1) {
      addError(report, 'TRADED_PICK_INVALID_ROUND', 'tradedPicks.round must be a positive number', `tradedPicks[${i}].round`)
      continue
    }
    const origId = r.originalRosterId ?? (r.previousOwnerName ? ctx.displayNameToRosterId[normalizeDisplayName(r.previousOwnerName)] : null)
    const newId = r.newRosterId ?? (r.newOwnerName ? ctx.displayNameToRosterId[normalizeDisplayName(r.newOwnerName)] : null)
    if (!origId || !newId) {
      addWarning(report, 'TRADED_PICK_UNRESOLVED', `Traded pick round ${r.round} could not resolve roster ids`, `tradedPicks[${i}]`)
      continue
    }
    result.push({
      round,
      originalRosterId: origId,
      previousOwnerName: r.previousOwnerName ?? ctx.rosterIdToDisplayName[origId] ?? '',
      newRosterId: newId,
      newOwnerName: r.newOwnerName ?? ctx.rosterIdToDisplayName[newId] ?? '',
    })
  }
  return result
}

/**
 * Map keeper config and selections. Resolve rosterId for each selection.
 */
function mapKeeper(
  rawConfig: RawKeeperConfig | undefined,
  rawSelections: RawKeeperSelection[] | undefined,
  ctx: LeagueImportContext,
  report: ImportErrorReport
): { config: KeeperConfig | null; selections: KeeperSelection[] } {
  const config: KeeperConfig | null = rawConfig && typeof rawConfig.maxKeepers === 'number'
    ? {
        maxKeepers: Math.max(0, Math.min(50, rawConfig.maxKeepers)),
        deadline: rawConfig.deadline ?? null,
        maxKeepersPerPosition: rawConfig.maxKeepersPerPosition ?? undefined,
      }
    : null
  const selections: KeeperSelection[] = []
  if (rawSelections?.length) {
    for (const s of rawSelections) {
      const rosterId = s.rosterId ?? (s.displayName ? ctx.displayNameToRosterId[normalizeDisplayName(s.displayName)] : null)
      if (!rosterId) {
        addWarning(report, 'KEEPER_ROSTER_UNRESOLVED', `Keeper "${s.playerName}" has no resolved roster`, 'keeperSelections')
        continue
      }
      const roundCost = Number(s.roundCost)
      if (!Number.isFinite(roundCost) || roundCost < 1) {
        addError(report, 'KEEPER_INVALID_ROUND_COST', `Keeper "${s.playerName}" has invalid roundCost`, 'keeperSelections')
        continue
      }
      selections.push({
        rosterId,
        roundCost: Math.trunc(roundCost),
        playerName: (s.playerName ?? '').trim(),
        position: (s.position ?? '').trim() || '—',
        team: s.team != null ? String(s.team) : null,
        playerId: s.playerId != null ? String(s.playerId) : null,
      })
    }
  }
  return { config, selections }
}

/**
 * Full mapping: raw payload + league context → preview + report.
 */
export function mapPayloadToPreview(
  payload: RawDraftImportPayload,
  ctx: LeagueImportContext
): { preview: DraftImportPreview; report: ImportErrorReport } {
  const report = createEmptyReport()
  const teamCount = typeof payload.metadata?.teamCount === 'number' && Number.isFinite(payload.metadata.teamCount)
    ? Math.max(1, Math.min(50, Math.trunc(payload.metadata.teamCount)))
    : ctx.teamCount
  const rounds = typeof payload.metadata?.rounds === 'number' && Number.isFinite(payload.metadata.rounds)
    ? Math.max(1, Math.min(60, Math.trunc(payload.metadata.rounds)))
    : ctx.rounds

  const slotOrder = mapDraftOrder(payload.draftOrder, { ...ctx, teamCount, rounds }, report)
  const picks = mapPicks(payload.picks, slotOrder, teamCount, ctx, report)
  const tradedPicks = mapTradedPicks(payload.tradedPicks, ctx, report)
  const { config: keeperConfig, selections: keeperSelections } = mapKeeper(
    payload.keeperConfig,
    payload.keeperSelections,
    ctx,
    report
  )

  const preview: DraftImportPreview = {
    slotOrder,
    picks,
    tradedPicks,
    keeperConfig: keeperConfig ?? undefined,
    keeperSelections: keeperSelections.length ? keeperSelections : undefined,
    metadata: {
      rounds,
      teamCount,
      draftType: payload.metadata?.draftType,
      thirdRoundReversal: payload.metadata?.thirdRoundReversal,
    },
    summary: {
      pickCount: picks.length,
      tradedPickCount: tradedPicks.length,
      keeperCount: keeperSelections.length,
      slotOrderLength: slotOrder.length,
    },
  }
  return { preview, report }
}
