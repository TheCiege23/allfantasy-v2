/**
 * Tool registry tests — alias normalization and mode fallback safety.
 */

import { describe, expect, it } from 'vitest'
import { getToolEntry, resolveEffectiveMode, isModeAllowed } from '../tool-registry'

describe('tool-registry aliases', () => {
  it('resolves hyphenated keys to canonical tools', () => {
    const trade = getToolEntry('trade-analyzer')
    const draft = getToolEntry('draft-helper')
    const chimmy = getToolEntry('chimmy-chat')
    expect(trade?.key).toBe('trade_analyzer')
    expect(draft?.key).toBe('draft_helper')
    expect(chimmy?.key).toBe('chimmy_chat')
  })

  it('resolves story alias to story creator', () => {
    const story = getToolEntry('story')
    expect(story?.key).toBe('story_creator')
  })
})

describe('tool-registry mode safety', () => {
  it('falls back to default mode when requested mode is not allowed', () => {
    expect(isModeAllowed('chimmy_chat', 'specialist')).toBe(false)
    expect(resolveEffectiveMode('chimmy_chat', 'specialist')).toBe('unified_brain')
  })
})
