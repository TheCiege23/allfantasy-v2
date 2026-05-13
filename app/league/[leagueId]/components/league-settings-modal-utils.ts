/** Helpers for reading Sleeper-shaped data from Prisma `League.settings` JSON */

export function getSettingsRecord(settings: unknown): Record<string, unknown> {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return {}
  return settings as Record<string, unknown>
}

/** Merge top-level with nested Sleeper snapshot if present */
export function getSleeperLikeBundle(settings: unknown): Record<string, unknown> {
  const s = getSettingsRecord(settings)
  const nested =
    (s.sleeper as Record<string, unknown> | undefined) ??
    (s.sleeperLeague as Record<string, unknown> | undefined) ??
    (s.league as Record<string, unknown> | undefined)
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return { ...s, ...nested }
  }
  return s
}

export function getDraftIdFromSettings(settings: unknown): string | null {
  const s = getSleeperLikeBundle(settings)
  const d = s.draft_id ?? s.draftId
  if (typeof d === 'string' && d.trim()) return d.trim()
  if (typeof d === 'number' && Number.isFinite(d)) return String(d)
  return null
}

export function getScoringSettings(settings: unknown): Record<string, number> {
  const s = getSleeperLikeBundle(settings)
  const raw = s.scoring_settings
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
  }
  return out
}

export function detectScoringFlavor(scoringSettings: Record<string, number>): 'PPR' | 'Half PPR' | 'Standard' | 'Custom' {
  const rec = scoringSettings.rec ?? scoringSettings.Rec ?? 0
  if (rec >= 1) return 'PPR'
  if (rec >= 0.5) return 'Half PPR'
  if (rec > 0) return 'Custom'
  return 'Standard'
}

/** Human-readable label for a flat `scoring_settings` key (Sleeper-style). */
export function humanizeScoringKey(key: string): string {
  const t = key.trim()
  if (!t) return key
  return t
    .replace(/_/g, ' ')
    .split(/\s+/)
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ')
}

/**
 * Best-effort daily waiver / clear schedule lines from synced league JSON.
 * Shape varies by platform; may return empty when not present.
 */
export function extractWaiverScheduleLines(settings: unknown): { daily: string[]; clearWaivers?: string } {
  const b = getSleeperLikeBundle(settings)
  const daily: string[] = []

  const dw = b.daily_waivers
  if (dw && typeof dw === 'object' && !Array.isArray(dw)) {
    const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    const keys = Object.keys(dw as Record<string, unknown>)
    const sorted = [...keys].sort((a, b) => order.indexOf(a.toLowerCase()) - order.indexOf(b.toLowerCase()))
    for (const k of sorted.length ? sorted : keys) {
      const v = (dw as Record<string, unknown>)[k]
      if (v == null) continue
      const label = typeof v === 'object' ? JSON.stringify(v) : String(v)
      daily.push(`${k.charAt(0).toUpperCase()}${k.slice(1)}: ${label}`)
    }
  }

  const cw =
    b.clear_waiver_day ??
    b.clear_waivers_day ??
    b.waiver_clear_day ??
    (typeof b.settings === 'object' && b.settings && !Array.isArray(b.settings)
      ? (b.settings as Record<string, unknown>).clear_waiver_day
      : undefined)
  const clearWaivers =
    cw != null && String(cw).trim() ? `Clear waivers: ${String(cw)}` : undefined

  return { daily, clearWaivers }
}

export function waiverTypeLabel(waiverType: unknown): string {
  if (waiverType === 0 || waiverType === '0') return 'FAAB (waiver budget)'
  if (waiverType === 1 || waiverType === '1') return 'Rolling waivers'
  if (waiverType === 2 || waiverType === '2') return 'Reverse standings'
  return typeof waiverType === 'string' || typeof waiverType === 'number' ? String(waiverType) : '—'
}

/** Best-effort division count from synced league JSON (host shapes vary). */
export function getDivisionCount(settings: unknown): number | null {
  const b = getSleeperLikeBundle(settings)
  const s = getSettingsRecord(settings)
  const nested =
    typeof b.settings === 'object' && b.settings && !Array.isArray(b.settings)
      ? (b.settings as Record<string, unknown>)
      : null
  const raw =
    b.divisions ??
    s.divisions ??
    b.num_divisions ??
    s.num_divisions ??
    nested?.divisions ??
    nested?.num_divisions
  if (Array.isArray(raw)) return raw.length
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string' && raw.trim() && !Number.isNaN(Number(raw))) return Number(raw)
  return null
}

/** Count each slot type from a Sleeper-style `roster_positions` array. */
export function groupRosterSlotCounts(rosterPositions: string[]): { slot: string; count: number }[] {
  const m = new Map<string, number>()
  for (const p of rosterPositions) {
    const k = String(p).trim()
    if (!k) continue
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  const entries = [...m.entries()]
  const order = [
    'QB',
    'RB',
    'WR',
    'TE',
    'FLEX',
    'REC_FLEX',
    'WRRB_FLEX',
    'WRT_FLEX',
    'SUPER_FLEX',
    'K',
    'DEF',
    'DL',
    'LB',
    'DB',
    'IDP_FLEX',
    'BN',
  ]
  const rank = (slot: string) => {
    const i = order.indexOf(slot)
    return i === -1 ? 500 + slot.charCodeAt(0) : i
  }
  entries.sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]))
  return entries.map(([slot, count]) => ({ slot, count }))
}

export function sleeperAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar?.trim()) return null
  const t = avatar.trim()
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  return `https://sleepercdn.com/avatars/${t}`
}

export function leagueAvatarSrc(avatarUrl: string | null | undefined): string | null {
  return sleeperAvatarUrl(avatarUrl)
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

export const NOT_CONFIGURED_YET = 'Not configured yet'

export function withNotConfigured(value: string | null | undefined): string {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed.length > 0 ? trimmed : NOT_CONFIGURED_YET
}

export function formatDraftTypeLabel(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (!value) return NOT_CONFIGURED_YET
  if (value === 'snake') return 'Snake Draft'
  if (value === 'auction') return 'Auction Draft'
  if (value === 'linear') return 'Linear Draft'
  if (value === 'slow' || value === 'slow_draft') return 'Slow Draft'
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export function formatConceptLabel(options: {
  leagueType?: string | null
  leagueVariant?: string | null
  isDynasty?: boolean | null
  bestBallMode?: boolean | null
  guillotineMode?: boolean | null
  fallbackFormat?: string | null
}): string {
  if (options.guillotineMode) return 'Guillotine'
  if (options.bestBallMode) return 'Best Ball'
  const variant = (options.leagueVariant ?? '').trim().toLowerCase()
  if (variant === 'survivor') return 'Survivor'
  if (variant === 'zombie') return 'Zombie'
  if (variant === 'big_brother') return 'Big Brother'
  if (variant === 'idp' || variant === 'dynasty_idp') return 'IDP'
  if (variant === 'devy_dynasty') return 'Devy Dynasty'
  if (variant === 'merged_devy_c2c') return 'C2C'

  const leagueType = (options.leagueType ?? '').trim().toLowerCase()
  if (leagueType === 'redraft') return 'Redraft'
  if (leagueType === 'dynasty') return 'Dynasty'
  if (leagueType === 'keeper') return 'Keeper'
  if (leagueType === 'devy') return 'Devy'
  if (leagueType === 'c2c') return 'C2C'

  if (options.isDynasty) return 'Dynasty'
  if ((options.fallbackFormat ?? '').trim()) {
    return options.fallbackFormat!.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  }
  return NOT_CONFIGURED_YET
}

export function readLeagueTimezone(settings: unknown, fallback?: string | null): string {
  const bundle = getSleeperLikeBundle(settings)
  const root = getSettingsRecord(settings)
  const nested = toRecord(bundle.settings)
  const candidate =
    bundle.timezone ??
    bundle.time_zone ??
    bundle.tz ??
    root.timezone ??
    root.time_zone ??
    root.tz ??
    nested.timezone ??
    nested.time_zone ??
    nested.tz ??
    fallback
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  return NOT_CONFIGURED_YET
}

export function formatScoringPresetLabel(scoring: string | null | undefined, settings: unknown): string {
  if (typeof scoring === 'string' && scoring.trim()) return scoring.trim()
  const bundle = getSleeperLikeBundle(settings)
  const root = getSettingsRecord(settings)
  const nested = toRecord(bundle.settings)
  const candidate = bundle.scoring ?? bundle.scoring_type ?? root.scoring ?? nested.scoring
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  return detectScoringFlavor(getScoringSettings(settings))
}

export function buildLeagueSummaryLine(options: {
  sport: string
  teamCount: number
  concept: string
  draftType: string
  scoringPreset: string
  timezone: string
}): string {
  return `${options.teamCount}-Team ${options.sport} ${options.concept} • ${options.draftType} • ${options.scoringPreset} • ${options.timezone}`
}

export function initialsFromName(name: string): string {
  const t = name.trim()
  if (!t) return 'AF'
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return t.slice(0, 2).toUpperCase()
}

export const SETTINGS_TAB_STORAGE_PREFIX = 'af-league-settings-tab-'

export type SettingsTabKey = 'user' | 'general' | 'commish' | 'ai' | 'idp'

export function readStoredTab(leagueId: string, isCommissioner: boolean): SettingsTabKey {
  if (typeof window === 'undefined') return 'general'
  try {
    const v = window.localStorage.getItem(`${SETTINGS_TAB_STORAGE_PREFIX}${leagueId}`) as SettingsTabKey | null
    if (v === 'ai' || v === 'general' || v === 'user') return v
    /** Legacy COMMISH tab merged into commissioner settings hub. */
    if (v === 'commish') return 'general'
    if (v === 'idp') return 'idp'
  } catch {
    /* ignore */
  }
  return 'general'
}

export function writeStoredTab(leagueId: string, tab: SettingsTabKey) {
  try {
    window.localStorage.setItem(`${SETTINGS_TAB_STORAGE_PREFIX}${leagueId}`, tab)
  } catch {
    /* ignore */
  }
}
