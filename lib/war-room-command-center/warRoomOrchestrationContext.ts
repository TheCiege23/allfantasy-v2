import 'server-only'

import type { NormalizedLeagueContext } from '@/lib/league-context-engine/types'
import type { AiTimeContextPayload } from '@/lib/time-engine/types'
import { buildAiTimeContextPayload } from '@/lib/time-engine/userContext'
import { normalizeToSupportedSport, type SupportedSport } from '@/lib/sport-scope'
import type { WarRoomAggregatedSourceFlags, WarRoomIngestionRow, WarRoomToggles } from './types'

/**
 * Extract the `sourceFlags` object from a module's result, if it exposes one.
 * Returns null when missing or not an object — we never invent flags.
 */
function extractSourceFlags(value: unknown): Record<string, boolean> | null {
  if (!value || typeof value !== 'object') return null
  const sf = (value as { sourceFlags?: unknown }).sourceFlags
  if (!sf || typeof sf !== 'object') return null
  const out: Record<string, boolean> = {}
  for (const [k, v] of Object.entries(sf)) {
    if (typeof v === 'boolean') out[k] = v
  }
  return Object.keys(out).length > 0 ? out : null
}

/**
 * Pool per-module source flags into a War Room-level coverage summary so the
 * modal can render compact chips (e.g. "3/5 modules have weather").
 */
export function aggregateSourceFlags(rows: WarRoomIngestionRow[]): WarRoomAggregatedSourceFlags {
  const okRows = rows.filter((r) => r.status === 'ok')
  let projCount = 0
  let injCount = 0
  let wxCount = 0
  let scoreCount = 0
  let aiCount = 0
  for (const r of okRows) {
    const f = r.sourceFlags
    if (!f) continue
    if (f.projectionLayerReady || f.myProjectionReady || f.oppProjectionReady || f.rostersReady) projCount += 1
    if (f.injuryNewsLayerReady || f.injuryReportReady) injCount += 1
    if (f.weatherLayerReady) wxCount += 1
    if (f.leagueScoringApplied || f.leagueRulesReady) scoreCount += 1
    if (f.aiEnvelopeReady) aiCount += 1
  }
  return {
    projectionLayerReady: projCount > 0,
    injuryNewsLayerReady: injCount > 0,
    weatherLayerReady: wxCount > 0,
    leagueScoringAppliedEverywhere: okRows.length > 0 && scoreCount === okRows.length,
    aiEnvelopeReady: aiCount > 0,
    moduleCounts: {
      withProjections: projCount,
      withInjuryNews: injCount,
      withWeather: wxCount,
      withLeagueScoring: scoreCount,
      total: okRows.length,
    },
  }
}

export function leagueScoringDigestFromLce(ctx: NormalizedLeagueContext | null): string | null {
  if (!ctx?.scoring) return null
  const s = ctx.scoring
  return `${s.scoringModel} · ${s.labels.receptionFormat} · SF ${s.labels.isSuperflex ? 'on' : 'off'}`
}

export function summarizeAiTimePayload(p: AiTimeContextPayload): string {
  const parts: string[] = []
  parts.push(`${p.userLocalCalendarDate} · ${p.userTimezone}`)
  if (p.sportWindow?.note) parts.push(p.sportWindow.note)
  if (p.timeUntilNextLockMs != null && p.timeUntilNextLockMs >= 0 && p.timeUntilNextLockMs <= 1000 * 60 * 360) {
    parts.push(`Next lock ~${Math.max(1, Math.round(p.timeUntilNextLockMs / 60000))}m`)
  }
  if (p.timeAuthorityNote) parts.push(p.timeAuthorityNote)
  return parts.join(' · ')
}

export async function buildWarRoomAiTimeContext(args: {
  userId: string
  sportHint: SupportedSport | string | null
  injuryUpdatedAt?: string | null
  matchupLockAt?: string | null
}): Promise<{ payload: AiTimeContextPayload; summaryLine: string }> {
  const sport = args.sportHint != null ? normalizeToSupportedSport(String(args.sportHint)) : 'NFL'
  const payload = await buildAiTimeContextPayload(args.userId, {
    sportHint: sport,
    injuriesLastUpdatedAt: args.injuryUpdatedAt ?? null,
    matchupLockAt: args.matchupLockAt ?? null,
  })
  return { payload, summaryLine: summarizeAiTimePayload(payload) }
}

export function buildWarRoomIngestionHealth(args: {
  toggles: WarRoomToggles
  hasLeague: boolean
  rs: PromiseSettledResult<unknown>
  rw: PromiseSettledResult<unknown>
  ri: PromiseSettledResult<unknown>
  rt: PromiseSettledResult<unknown>
  rp: PromiseSettledResult<unknown>
  rmp: PromiseSettledResult<unknown>
  rtl: PromiseSettledResult<unknown>
  tradeOk: boolean
  tradeSkippedReason: string | null
}): WarRoomIngestionRow[] {
  const rows: WarRoomIngestionRow[] = []

  const failedDetail = (p: PromiseSettledResult<unknown>): string | undefined => {
    if (p.status === 'rejected') return p.reason instanceof Error ? p.reason.message : String(p.reason)
    return undefined
  }

  if (!args.hasLeague || !args.toggles.includeStartSitRecommendations) {
    rows.push({
      module: 'start_sit',
      status: 'skipped',
      detail: !args.hasLeague ? 'league scope required' : 'toggle off',
    })
  } else if (args.rs.status === 'rejected') {
    rows.push({ module: 'start_sit', status: 'failed', detail: failedDetail(args.rs) })
  } else {
    const v = args.rs.value
    const ok =
      v != null &&
      typeof v === 'object' &&
      'recommendations' in v &&
      (v as { recommendations?: unknown }).recommendations != null
    rows.push(
      ok
        ? { module: 'start_sit', status: 'ok', sourceFlags: extractSourceFlags(v) }
        : { module: 'start_sit', status: 'failed', detail: 'no recommendations' },
    )
  }

  if (!args.toggles.includeWaiverSuggestions) {
    rows.push({ module: 'waiver', status: 'skipped', detail: 'toggle off' })
  } else if (args.rw.status === 'rejected') {
    rows.push({ module: 'waiver', status: 'failed', detail: failedDetail(args.rw) })
  } else {
    const v = args.rw.value as { ok?: boolean; error?: string } | null
    const ok = v != null && v.ok === true
    rows.push(
      ok
        ? { module: 'waiver', status: 'ok', sourceFlags: extractSourceFlags(v) }
        : { module: 'waiver', status: 'failed', detail: v?.error ?? 'unavailable' },
    )
  }

  if (!args.hasLeague || !args.toggles.includeInjuries) {
    rows.push({
      module: 'injury',
      status: 'skipped',
      detail: !args.hasLeague ? 'league scope required' : 'toggle off',
    })
  } else if (args.ri.status === 'rejected') {
    rows.push({ module: 'injury', status: 'failed', detail: failedDetail(args.ri) })
  } else {
    const v = args.ri.value as { ok?: boolean; error?: string } | null
    const ok = v != null && v.ok === true
    rows.push(
      ok
        ? { module: 'injury', status: 'ok', sourceFlags: extractSourceFlags(v) }
        : { module: 'injury', status: 'failed', detail: v?.error ?? 'unavailable' },
    )
  }

  if (!args.toggles.includeTrendingPlayers) {
    rows.push({ module: 'trending', status: 'skipped', detail: 'toggle off' })
  } else if (args.rt.status === 'rejected') {
    rows.push({ module: 'trending', status: 'failed', detail: failedDetail(args.rt) })
  } else {
    const v = args.rt.value as { ok?: boolean; error?: string } | null
    const ok = v != null && v.ok === true
    rows.push(
      ok
        ? { module: 'trending', status: 'ok', sourceFlags: extractSourceFlags(v) }
        : { module: 'trending', status: 'failed', detail: v?.error ?? 'unavailable' },
    )
  }

  if (!args.hasLeague || !args.toggles.includePowerRankings) {
    rows.push({
      module: 'power_rankings',
      status: 'skipped',
      detail: !args.hasLeague ? 'league scope required' : 'toggle off',
    })
  } else if (args.rp.status === 'rejected') {
    rows.push({ module: 'power_rankings', status: 'failed', detail: failedDetail(args.rp) })
  } else {
    const v = args.rp.value as { ok?: boolean; error?: string; analysisScope?: string } | null
    const ok = v != null && v.ok === true && v.analysisScope !== 'none'
    rows.push(
      ok
        ? { module: 'power_rankings', status: 'ok', sourceFlags: extractSourceFlags(v) }
        : { module: 'power_rankings', status: 'failed', detail: v?.error ?? 'no league scope' },
    )
  }

  if (!args.hasLeague || !args.toggles.includeMatchupPrep) {
    rows.push({
      module: 'matchup_prep',
      status: 'skipped',
      detail: !args.hasLeague ? 'league scope required' : 'toggle off',
    })
  } else if (args.rmp.status === 'rejected') {
    rows.push({ module: 'matchup_prep', status: 'failed', detail: failedDetail(args.rmp) })
  } else {
    const v = args.rmp.value as { ok?: boolean; error?: string } | null
    const ok = v != null && v.ok === true
    rows.push(
      ok
        ? { module: 'matchup_prep', status: 'ok', sourceFlags: extractSourceFlags(v) }
        : { module: 'matchup_prep', status: 'failed', detail: v?.error ?? 'unavailable' },
    )
  }

  if (!args.toggles.includeTodayActions) {
    rows.push({ module: 'today_actions', status: 'skipped', detail: 'toggle off' })
  } else if (args.rtl.status === 'rejected') {
    rows.push({ module: 'today_actions', status: 'failed', detail: failedDetail(args.rtl) })
  } else {
    const v = args.rtl.value
    const ok = v != null && typeof v === 'object'
    rows.push(ok ? { module: 'today_actions', status: 'ok' } : { module: 'today_actions', status: 'failed', detail: 'empty' })
  }

  if (!args.toggles.includeTradeSuggestions) {
    rows.push({ module: 'trade_value', status: 'skipped', detail: 'toggle off' })
  } else if (args.tradeSkippedReason) {
    rows.push({ module: 'trade_value', status: 'skipped', detail: args.tradeSkippedReason })
  } else if (args.tradeOk) {
    rows.push({ module: 'trade_value', status: 'ok' })
  } else {
    rows.push({ module: 'trade_value', status: 'failed', detail: 'context unavailable' })
  }

  return rows
}
