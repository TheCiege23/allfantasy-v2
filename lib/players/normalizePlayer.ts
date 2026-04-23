import type { PlayerDisplayModel } from '@/lib/draft-sports-models/types'
import { buildDraftPlayerDisplayModel } from '@/lib/draft-sports-models/build-display-model'
import { DEFAULT_SPORT, normalizeToSupportedSport } from '@/lib/sport-scope'
import { getTeamLogo } from '@/lib/players/getTeamLogo'

/**
 * Single canonical shape for draft-room player visuals (pool rows, board, modal, history).
 * Does not replace API payloads — normalize at the UI boundary only.
 */
export type NormalizedDraftRoomPlayer = {
  id: string
  name: string
  position: string
  team: string | null
  adp?: number | null
  byeWeek?: number | null
  imageUrl?: string | null
  teamLogoUrl?: string | null
  projection?: number | null
  stats?: {
    summary?: string
    season?: Record<string, number | string>
  }
  news?: Array<{
    id: string
    title: string
    publishedAt?: string | null
  }>
}

function str(v: unknown, fallback = ''): string {
  if (v == null) return fallback
  const s = String(v).trim()
  return s || fallback
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function newsFromRaw(raw: Record<string, unknown>): NormalizedDraftRoomPlayer['news'] | undefined {
  const n = raw.news
  if (!Array.isArray(n)) return undefined
  const out: NonNullable<NormalizedDraftRoomPlayer['news']> = []
  for (let i = 0; i < n.length; i += 1) {
    const item = n[i]
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const title = str(o.title ?? o.headline, '')
    if (!title) continue
    out.push({
      id: str(o.id, `news-${i}`),
      title,
      publishedAt: o.publishedAt != null ? String(o.publishedAt) : o.date != null ? String(o.date) : null,
    })
  }
  return out.length ? out : undefined
}

function seasonRecordFromDisplay(display: PlayerDisplayModel): Record<string, number | string> | undefined {
  const s = display.stats
  const out: Record<string, number | string> = {}
  const pl = s.primaryStatLabel?.trim()
  if (pl && s.primaryStatValue != null) out[pl] = s.primaryStatValue
  const sl = s.secondaryStatLabel?.trim()
  if (sl && s.secondaryStatValue != null) out[sl] = s.secondaryStatValue
  if (s.adp != null) out.ADP = s.adp
  if (s.byeWeek != null) out.Bye = s.byeWeek
  if (s.fantasyPointsPerGame != null) out.PPG = s.fantasyPointsPerGame
  if (s.lifetimeValue != null) out.Val = s.lifetimeValue
  return Object.keys(out).length ? out : undefined
}

function statSummaryFromDisplay(display: PlayerDisplayModel): string {
  const s = display.stats
  const parts: string[] = []
  if (s.primaryStatLabel && s.primaryStatValue != null) {
    parts.push(`${s.primaryStatLabel} ${s.primaryStatValue}`)
  }
  if (s.secondaryStatLabel && s.secondaryStatValue != null) {
    parts.push(`${s.secondaryStatLabel} ${s.secondaryStatValue}`)
  }
  if (parts.length) return parts.join(' · ')
  if (s.adp != null) return `ADP ${s.adp}`
  if (s.fantasyPointsPerGame != null) return `PPG ${s.fantasyPointsPerGame}`
  if (s.primaryStatValue != null) return `ADP ${s.primaryStatValue}`
  return 'No stats available'
}

function isPlayerDisplayModel(x: unknown): x is PlayerDisplayModel {
  return Boolean(x && typeof x === 'object' && 'displayName' in x && 'assets' in x && 'metadata' in x)
}

function normalizeFromDisplay(
  display: PlayerDisplayModel,
  raw: Record<string, unknown>,
  sport: string,
): NormalizedDraftRoomPlayer {
  const meta = display.metadata
  const stats = display.stats
  const adp = stats.adp ?? stats.primaryStatValue ?? num(raw.adp)
  const byeWeek = meta.byeWeek ?? stats.byeWeek ?? num(raw.byeWeek ?? raw.bye)
  const teamAbbr = meta.teamAbbreviation ?? display.team?.abbreviation ?? (str(raw.team, '') || null)
  let imageUrl = display.assets.headshotUrl ?? null
  let teamLogoUrl = display.assets.teamLogoUrl ?? null
  if (!teamLogoUrl && teamAbbr) {
    teamLogoUrl = getTeamLogo(teamAbbr, sport)
  }
  const projection =
    num(raw.projection) ??
    num(raw.projectedPoints) ??
    num((raw.careerProjection as Record<string, unknown> | undefined)?.projectedPointsYear1)

  return {
    id: str(display.playerId ?? raw.id, 'unknown'),
    name: display.displayName,
    position: str(meta.position ?? raw.position, '—'),
    team: teamAbbr,
    adp,
    byeWeek,
    imageUrl,
    teamLogoUrl,
    projection: projection ?? undefined,
    stats: {
      summary: statSummaryFromDisplay(display),
      season: seasonRecordFromDisplay(display),
    },
    news: newsFromRaw(raw),
  }
}

/**
 * Normalize arbitrary pool/API/board payloads into {@link NormalizedDraftRoomPlayer}.
 * Safe for client-only use; does not mutate inputs.
 */
export function normalizePlayer(raw: unknown): NormalizedDraftRoomPlayer {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const sport = normalizeToSupportedSport(str(r.sport, DEFAULT_SPORT))

  const displayUnknown = r.display
  if (isPlayerDisplayModel(displayUnknown)) {
    return normalizeFromDisplay(displayUnknown, r, sport)
  }

  const name = str(r.name ?? r.playerName, '')
  const position = str(r.position, '—')
  const team = r.team != null && str(r.team) !== '' ? str(r.team) : null
  const playerId = r.playerId != null ? str(r.playerId) : r.id != null ? str(r.id) : null
  const byeRaw = num(r.byeWeek ?? r.bye)
  const adpFlat = num(r.adp)

  const built = buildDraftPlayerDisplayModel({
    playerName: name || 'Unknown',
    position: position === '—' ? '-' : position,
    team,
    playerId: playerId && !playerId.startsWith('name:') ? playerId : null,
    byeWeek: byeRaw,
    sport,
    injuryStatus: r.injuryStatus != null ? str(r.injuryStatus) : null,
    adp: adpFlat,
    isDevy: Boolean(r.isDevy),
    school: r.school != null ? str(r.school) : null,
    classYearLabel: r.classYearLabel != null ? str(r.classYearLabel) : null,
    draftGrade: r.draftGrade != null ? str(r.draftGrade) : null,
    projectedLandingSpot: r.projectedLandingSpot != null ? str(r.projectedLandingSpot) : null,
    collegeOrPipeline: r.collegeOrPipeline != null ? str(r.collegeOrPipeline) : r.college != null ? str(r.college) : null,
    graduatedToNFL: Boolean(r.graduatedToNFL),
    poolType: r.poolType === 'college' || r.poolType === 'pro' ? r.poolType : undefined,
  })

  return normalizeFromDisplay(built, r, sport)
}
