import { describe, expect, it } from 'vitest'

import { buildSmartFollowUpChips } from '@/lib/chimmy-chat/smart-followups'

describe('buildSmartFollowUpChips', () => {
  it('prioritizes answer-contract follow-ups before orchestration and fallback', () => {
    const chips = buildSmartFollowUpChips({
      contractFollowUps: [
        { label: 'Contract 1', prompt: 'contract-1' },
        { label: 'Contract 2', prompt: 'contract-2' },
      ],
      orchestrationFollowUps: [
        { label: 'Orch 1', prompt: 'orch-1' },
      ],
      fallbackFollowUps: [
        { label: 'Default 1', prompt: 'default-1' },
      ],
    })

    expect(chips.map((c) => c.prompt)).toEqual(['contract-1', 'contract-2', 'orch-1', 'default-1'])
  })

  it('deduplicates by prompt across all sources', () => {
    const chips = buildSmartFollowUpChips({
      contractFollowUps: [{ label: 'Contract', prompt: 'same' }],
      orchestrationFollowUps: [{ label: 'Orch', prompt: 'same' }],
      fallbackFollowUps: [{ label: 'Default', prompt: 'same' }],
    })

    expect(chips).toHaveLength(1)
    expect(chips[0]).toEqual({ label: 'Contract', prompt: 'same', origin: 'contract' })
  })

  it('enforces max of 5 chips by default', () => {
    const chips = buildSmartFollowUpChips({
      contractFollowUps: [
        { label: 'A', prompt: 'a' },
        { label: 'B', prompt: 'b' },
        { label: 'C', prompt: 'c' },
      ],
      orchestrationFollowUps: [
        { label: 'D', prompt: 'd' },
        { label: 'E', prompt: 'e' },
      ],
      fallbackFollowUps: [{ label: 'F', prompt: 'f' }],
    })

    expect(chips).toHaveLength(5)
    expect(chips.map((c) => c.prompt)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('honors custom limit', () => {
    const chips = buildSmartFollowUpChips({
      contractFollowUps: [
        { label: 'A', prompt: 'a' },
        { label: 'B', prompt: 'b' },
      ],
      orchestrationFollowUps: [{ label: 'C', prompt: 'c' }],
      fallbackFollowUps: [{ label: 'D', prompt: 'd' }],
      limit: 3,
    })

    expect(chips.map((c) => c.prompt)).toEqual(['a', 'b', 'c'])
  })

  it('drops invalid entries with blank label or prompt', () => {
    const chips = buildSmartFollowUpChips({
      contractFollowUps: [
        { label: 'Valid', prompt: 'valid' },
        { label: '', prompt: 'missing-label' },
        { label: 'Missing prompt', prompt: '   ' },
      ],
      orchestrationFollowUps: [{ label: 'Orch', prompt: 'orch' }],
    })

    expect(chips.map((c) => c.prompt)).toEqual(['valid', 'orch'])
  })

  it('returns empty list when all sources are missing', () => {
    const chips = buildSmartFollowUpChips({})
    expect(chips).toEqual([])
  })

  it('adds origin metadata by source', () => {
    const chips = buildSmartFollowUpChips({
      contractFollowUps: [{ label: 'Contract', prompt: 'contract' }],
      orchestrationFollowUps: [{ label: 'Orch', prompt: 'orch' }],
      fallbackFollowUps: [{ label: 'Fallback', prompt: 'fallback' }],
    })

    expect(chips).toEqual([
      { label: 'Contract', prompt: 'contract', origin: 'contract' },
      { label: 'Orch', prompt: 'orch', origin: 'orchestration' },
      { label: 'Fallback', prompt: 'fallback', origin: 'fallback' },
    ])
  })
})
