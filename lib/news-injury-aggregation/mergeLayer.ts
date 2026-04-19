import type { NewsContextItem } from '@/lib/upstream-apis'
import {
  severityScore,
  toCanonicalInjuryStatus,
} from '@/lib/news-injury-aggregation/canonicalStatus'
import {
  isMaterialProjectionImpact,
  projectionMultiplierForStatus,
} from '@/lib/news-injury-aggregation/projectionMultiplier'
import type {
  CanonicalInjuryStatus,
  InjuryNewsSourceKind,
  InjuryNewsSourceRow,
  NormalizedPlayerInjuryNewsLayer,
} from '@/lib/news-injury-aggregation/types'

const AUTHORITY: InjuryNewsSourceKind[] = [
  'injury_report_record',
  'sports_injury',
  'player_status_event',
  'rolling_insights',
  'sports_players_row',
]

function isAuthoritative(kind: InjuryNewsSourceKind): boolean {
  return AUTHORITY.includes(kind)
}

function confidenceForKind(kind: InjuryNewsSourceKind, fallback: number): number {
  switch (kind) {
    case 'injury_report_record':
      return 0.92
    case 'player_status_event':
      return 0.88
    case 'sports_injury':
      return 0.85
    case 'rolling_insights':
      return 0.8
    case 'sports_players_row':
      return 0.78
    case 'news_context':
      return 0.55
    case 'player_news':
      return 0.5
    default:
      return fallback
  }
}

function hoursBetween(now: Date, iso: string): number {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return 9999
  return Math.max(0, (now.getTime() - t) / (1000 * 60 * 60))
}

function pickWorstCanonical(rows: InjuryNewsSourceRow[]): CanonicalInjuryStatus {
  let worst: CanonicalInjuryStatus = 'unknown'
  let bestScore = -1
  for (const r of rows) {
    const c = toCanonicalInjuryStatus(r.statusRaw)
    const sc = severityScore(c)
    if (sc > bestScore) {
      bestScore = sc
      worst = c
    }
  }
  return worst
}

function detectConflict(
  rows: InjuryNewsSourceRow[],
  winning: CanonicalInjuryStatus,
): { conflict: boolean; detail: string | null } {
  const authoritative = rows.filter((r) => isAuthoritative(r.kind) && r.confidence >= 0.65)
  if (authoritative.length < 2) {
    return { conflict: false, detail: null }
  }
  const canonicals = new Map<CanonicalInjuryStatus, InjuryNewsSourceRow[]>()
  for (const r of authoritative) {
    const c = toCanonicalInjuryStatus(r.statusRaw)
    const list = canonicals.get(c) ?? []
    list.push(r)
    canonicals.set(c, list)
  }
  if (canonicals.size < 2) {
    return { conflict: false, detail: null }
  }
  const winScore = severityScore(winning)
  for (const [c, list] of canonicals) {
    if (c === winning) continue
    const other = list[0]
    if (!other) continue
    const spread = Math.abs(winScore - severityScore(c))
    if (spread >= 30) {
      return {
        conflict: true,
        detail: `Sources disagree: ${winning} vs ${c} (${other.label}).`,
      }
    }
  }
  return { conflict: false, detail: null }
}

function summarizeNews(headlines: string[]): string | null {
  const h = headlines.map((x) => x.trim()).filter(Boolean)
  if (h.length === 0) return null
  return h.slice(0, 3).join(' · ')
}

export function mergeInjuryNewsLayer(args: {
  sport: string
  playerName: string
  playerId: string | null
  teamAbbrev: string | null
  sources: InjuryNewsSourceRow[]
  extraNewsHeadlines?: string[]
  newsContextItems?: NewsContextItem[]
}): NormalizedPlayerInjuryNewsLayer {
  const now = new Date()
  const rows: InjuryNewsSourceRow[] = [...args.sources]

  const lowerName = args.playerName.toLowerCase()
  for (const item of args.newsContextItems ?? []) {
    const hitPlayer =
      item.playerName?.toLowerCase() === lowerName ||
      item.title.toLowerCase().includes(lowerName)
    if (!hitPlayer) continue
    if (item.isInjury && item.injuryStatus) {
      rows.push({
        kind: 'news_context',
        label: item.source || 'news_context',
        statusRaw: item.injuryStatus,
        atIso: item.publishedAt,
        detail: item.title,
        confidence: confidenceForKind('news_context', 0.55),
      })
    }
  }

  for (const r of rows) {
    if (r.confidence == null || Number.isNaN(r.confidence)) {
      r.confidence = confidenceForKind(r.kind, 0.5)
    }
  }

  const canonicalStatus = pickWorstCanonical(rows)
  const mult = projectionMultiplierForStatus(canonicalStatus)
  const material = isMaterialProjectionImpact(mult)
  const { conflict, detail } = detectConflict(rows, canonicalStatus)

  let newestIso: string | null = null
  let newestMs = 0
  for (const r of rows) {
    const ms = new Date(r.atIso).getTime()
    if (Number.isFinite(ms) && ms >= newestMs) {
      newestMs = ms
      newestIso = r.atIso
    }
  }

  const primary =
    rows
      .filter((r) => toCanonicalInjuryStatus(r.statusRaw) === canonicalStatus)
      .sort((a, b) => new Date(b.atIso).getTime() - new Date(a.atIso).getTime())[0] ?? rows[0]

  const freshHours = newestIso ? hoursBetween(now, newestIso) : null

  const headlines: string[] = [...(args.extraNewsHeadlines ?? [])]
  for (const item of args.newsContextItems ?? []) {
    const hit =
      item.playerName?.toLowerCase() === lowerName ||
      item.title.toLowerCase().includes(lowerName)
    if (hit && item.title) headlines.push(item.title)
  }

  const practice =
    rows.map((r) => r.practice).find((p) => p && p.trim()) ?? null
  const gameDesignation =
    rows.map((r) => r.gameStatus).find((g) => g && g.trim()) ?? null

  const suspensionOrUnavailable = canonicalStatus === 'suspended' || canonicalStatus === 'ir'

  let returnHint: string | null = null
  for (const r of rows) {
    const d = r.detail ?? ''
    if (/return|week|expected|timeline|rehab/i.test(d)) {
      returnHint = d.slice(0, 160)
      break
    }
  }

  const avgConfidence =
    rows.length > 0 ? rows.reduce((s, r) => s + r.confidence, 0) / rows.length : null

  return {
    schemaVersion: 1,
    sport: args.sport,
    playerName: args.playerName,
    playerId: args.playerId,
    teamAbbrev: args.teamAbbrev,
    canonicalStatus,
    practiceReport: practice,
    gameDesignation,
    suspensionOrUnavailable,
    returnTimelineHint: returnHint,
    playerNewsSummary: summarizeNews(headlines),
    primarySource: primary?.label ?? null,
    primarySourceAt: primary?.atIso ?? newestIso,
    freshnessHours: freshHours,
    confidence: avgConfidence != null ? Math.round(avgConfidence * 100) / 100 : null,
    conflict,
    conflictDetail: detail,
    materialProjectionImpact: material,
    projectionMultiplier: mult,
    sources: rows,
  }
}
