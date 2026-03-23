import { describe, expect, it } from 'vitest'
import { AVATAR_PRESET_EMOJI, getAvatarPresetEmoji, getAvatarCatalog } from '@/lib/avatar'
import { AVATAR_PRESETS } from '@/lib/signup/avatar-presets'

describe('avatar catalog resolver', () => {
  it('keeps one emoji mapping per preset id', () => {
    expect(Object.keys(AVATAR_PRESET_EMOJI)).toHaveLength(AVATAR_PRESETS.length)
    const emojiValues = Object.values(AVATAR_PRESET_EMOJI)
    expect(new Set(emojiValues).size).toBe(AVATAR_PRESETS.length)
  })

  it('returns null for missing preset ids', () => {
    expect(getAvatarPresetEmoji(null)).toBeNull()
    expect(getAvatarPresetEmoji(undefined)).toBeNull()
    expect(getAvatarPresetEmoji('unknown-preset')).toBeNull()
  })

  it('returns a complete picker catalog', () => {
    const catalog = getAvatarCatalog()
    expect(catalog).toHaveLength(AVATAR_PRESETS.length)
    expect(catalog.every((entry) => entry.id && entry.label && entry.emoji)).toBe(true)
  })
})
