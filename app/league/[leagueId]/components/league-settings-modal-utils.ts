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

export function waiverTypeLabel(waiverType: unknown): string {
  if (waiverType === 0 || waiverType === '0') return 'FAAB (waiver budget)'
  if (waiverType === 1 || waiverType === '1') return 'Rolling waivers'
  if (waiverType === 2 || waiverType === '2') return 'Reverse standings'
  return typeof waiverType === 'string' || typeof waiverType === 'number' ? String(waiverType) : '—'
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

export function initialsFromName(name: string): string {
  const t = name.trim()
  if (!t) return 'AF'
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return t.slice(0, 2).toUpperCase()
}

export const SETTINGS_TAB_STORAGE_PREFIX = 'af-league-settings-tab-'

export type SettingsTabKey = 'general' | 'commish' | 'ai' | 'idp'

export function readStoredTab(leagueId: string, isCommissioner: boolean): SettingsTabKey {
  if (typeof window === 'undefined') return 'general'
  try {
    const v = window.localStorage.getItem(`${SETTINGS_TAB_STORAGE_PREFIX}${leagueId}`) as SettingsTabKey | null
    if (v === 'ai' || v === 'general') return v
    if (v === 'commish' && isCommissioner) return 'commish'
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
