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
  const result: SlotOrderEntry[] = []
  const used = new Set<string>()

  if (rawOrder && rawOrder.length >= teamCount) {
    for (let i = 0; i < teamCount; i++) {
      const entry = rawOrder[i]
      const rosterId = resolveRosterId(entry, ctx) ?? ctx.rosterIdsBySlot?.[i]
      const displayName = entry?.displayName ?? entry?.teamName ?? entry?.ownerName ?? (rosterId ? ctx.rosterIdToDisplayName[rosterId] : null) ?? `Team ${i + 1}`
      if (rosterId) {
        if (used.has(rosterId)) addWarning(report, 'DUPLICATE_ROSTER_ORDER', `Roster ${displayName} appears more than once in draft order`, `draftOrder[${i}]`)
        used.add(rosterId)
        result.push({ slot: i + 1, rosterId, displayName })
      } else {
        const fallbackId = `import-slot-${i + 1}`
        result.push({ slot: i + 1, rosterId: fallbackId, displayName })
        addWarning(report, 'UNRESOLVED_ROSTER', `Could not resolve roster for "${displayName}"`, `draftOrder[${i}]`)
      }
    }
    return result
  }

  if (ctx.rosterIdsBySlot && ctx.rosterIdsBySlot.length >= teamCount) {
    return ctx.rosterIdsBySlot.slice(0, teamCount).map((rosterId, i) => ({
      slot: i + 1,
      rosterId,
      displayName: ctx.rosterIdToDisplayName[rosterId] ?? `Team ${i + 1}`,
    }))
  }

  for (let i = 0; i < teamCount; i++) {
    result.push({
      slot: i + 1,
      rosterId: `import-slot-${i + 1}`,
      displayName: `Team ${i + 1}`,
    })
  }
  if (rawOrder && rawOrder.length > 0) addWarning(report, 'DRAFT_ORDER_LENGTH', `Draft order has ${rawOrder.length} entries; expected ${teamCount}`, 'draftOrder')
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
  const byOverall = new Map<number, RawPickEntry>()
  for (const p of rawPicks) {
    const overall = p.overall ?? (p.round != null && p.slot != null ? (p.round - 1) * teamCount + p.slot : 0)
    if (overall > 0) byOverall.set(overall, p)
  }
  const sortedOveralls = [...byOverall.keys()].sort((a, b) => a - b)
  for (const overall of sortedOveralls) {
    const raw = byOverall.get(overall)!
    const round = raw.round ?? Math.ceil(overall / teamCount)
    const slot = raw.slot ?? ((overall - 1) % teamCount) + 1
    const rosterId = resolveRosterId(raw, ctx) ?? slotOrder[slot - 1]?.rosterId ?? `import-slot-${slot}`
    const displayName = raw.displayName ?? ctx.rosterIdToDisplayName[rosterId] ?? null
    if (!raw.playerName?.trim()) {
      addError(report, 'MISSING_PLAYER_NAME', `Pick #${overall} has no player name`, `picks[${overall}]`)
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
      source: 'user',
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
    const origId = r.originalRosterId ?? (r.previousOwnerName ? ctx.displayNameToRosterId[normalizeDisplayName(r.previousOwnerName)] : null)
    const newId = r.newRosterId ?? (r.newOwnerName ? ctx.displayNameToRosterId[normalizeDisplayName(r.newOwnerName)] : null)
    if (!origId || !newId) {
      addWarning(report, 'TRADED_PICK_UNRESOLVED', `Traded pick round ${r.round} could not resolve roster ids`, `tradedPicks[${i}]`)
      continue
    }
    result.push({
      round: r.round,
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
      selections.push({
        rosterId,
        roundCost: s.roundCost,
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
  const teamCount = payload.metadata?.teamCount ?? ctx.teamCount
  const rounds = payload.metadata?.rounds ?? ctx.rounds

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
    metadata: payload.metadata,
    summary: {
      pickCount: picks.length,
      tradedPickCount: tradedPicks.length,
      keeperCount: keeperSelections.length,
      slotOrderLength: slotOrder.length,
    },
  }
  return { preview, report }
}
