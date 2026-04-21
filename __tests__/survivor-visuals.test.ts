import { describe, expect, it } from 'vitest'
import {
  SURVIVOR_BACKGROUND_THEME_IDS,
  SURVIVOR_TRIBE_ICON_CHOICES,
  composeTribeName,
  extractLeadingTribeIcon,
  getSurvivorThemeById,
  pickSurvivorThemeIdForLeague,
  stripLeadingTribeIcon,
} from '@/lib/survivor/survivorVisuals'

describe('survivor visuals', () => {
  it('extracts a leading tribe icon and strips it back out', () => {
    expect(extractLeadingTribeIcon('🔥 Fire Tribe')).toBe('🔥')
    expect(stripLeadingTribeIcon('🔥 Fire Tribe')).toBe('Fire Tribe')
  })

  it('ignores invalid icons and preserves plain names', () => {
    expect(extractLeadingTribeIcon('Theater Tribe')).toBeNull()
    expect(composeTribeName('🎭', 'Theater Tribe')).toBe('Theater Tribe')
  })

  it('replaces an existing icon when recomposing a tribe name', () => {
    expect(composeTribeName('🌴', '🔥 Fire Tribe')).toBe('🌴 Fire Tribe')
  })

  it('falls back to Tribe when the name is empty', () => {
    expect(composeTribeName('🔥', '')).toBe('🔥 Tribe')
    expect(composeTribeName(null, '')).toBe('Tribe')
  })

  it('supports every configured icon choice', () => {
    for (const icon of SURVIVOR_TRIBE_ICON_CHOICES) {
      expect(extractLeadingTribeIcon(`${icon} Tribe`)).toBe(icon)
      expect(composeTribeName(icon, 'Test')).toBe(`${icon} Test`)
    }
  })

  it('returns deterministic and valid theme ids per league', () => {
    const first = pickSurvivorThemeIdForLeague('league-123')
    const second = pickSurvivorThemeIdForLeague('league-123')
    expect(first).toBe(second)
    expect(SURVIVOR_BACKGROUND_THEME_IDS).toContain(first)
  })

  it('resolves a valid theme object for explicit and fallback ids', () => {
    const explicit = getSurvivorThemeById('island-dawn')
    expect(explicit.id).toBe('island-dawn')
    const fallback = getSurvivorThemeById('not-a-theme', 'league-xyz')
    expect(SURVIVOR_BACKGROUND_THEME_IDS).toContain(fallback.id)
    expect(fallback.backgroundClass.length).toBeGreaterThan(0)
  })
})