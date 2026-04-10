import type { LeagueSport } from '@prisma/client'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'

export const FAVORITE_SPORTS_STORAGE_KEY = 'af-onboarding-favorite-sports-v1'

export type FavoriteSportsSelection = {
  /** Platform-supported sports the user cares about */
  supported: LeagueSport[]
  /** Free-text sports (e.g. cricket, rugby) not in AF league sport enum */
  custom: string[]
}

export function getDefaultFavoriteSportsSelection(): FavoriteSportsSelection {
  return { supported: [], custom: [] }
}

export function readFavoriteSportsSelection(): FavoriteSportsSelection {
  if (typeof window === 'undefined') return getDefaultFavoriteSportsSelection()
  try {
    const raw = window.localStorage.getItem(FAVORITE_SPORTS_STORAGE_KEY)
    if (!raw) return getDefaultFavoriteSportsSelection()
    const parsed = JSON.parse(raw) as Partial<FavoriteSportsSelection>
    const supported = Array.isArray(parsed.supported)
      ? parsed.supported.filter((s): s is LeagueSport =>
          typeof s === 'string' && (SUPPORTED_SPORTS as readonly string[]).includes(s),
        )
      : []
    const custom = Array.isArray(parsed.custom)
      ? parsed.custom.filter((c): c is string => typeof c === 'string').map((c) => c.trim()).filter(Boolean)
      : []
    return { supported, custom }
  } catch {
    return getDefaultFavoriteSportsSelection()
  }
}

export function writeFavoriteSportsSelection(value: FavoriteSportsSelection) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(FAVORITE_SPORTS_STORAGE_KEY, JSON.stringify(value))
  } catch {}
}

export function hasAnyFavoriteSport(selection: FavoriteSportsSelection): boolean {
  return selection.supported.length > 0 || selection.custom.length > 0
}
