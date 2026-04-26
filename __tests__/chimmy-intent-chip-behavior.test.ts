import { describe, expect, it } from 'vitest'

import {
  getChimmyIntentChipDefinitions,
  getChimmyIntentChips,
} from '@/lib/chimmy-chat/intent-chips'

describe('getChimmyIntentChipDefinitions', () => {
  it('returns the expected intent chip labels for first-message chips', () => {
    const labels = getChimmyIntentChipDefinitions().map((chip) => chip.label)

    expect(labels).toEqual([
      'Trade Help',
      'Start/Sit',
      'Waiver Help',
      "Today's Injuries",
      'League Recap',
      'Draft Help',
      'Commissioner Help',
    ])
  })
})

describe('getChimmyIntentChips', () => {
  it('includes league context in prompts only when leagueName is available', () => {
    const withLeague = getChimmyIntentChips({ leagueName: 'Alpha League' })
    const withoutLeague = getChimmyIntentChips({ leagueName: null })

    const withLeagueTrade = withLeague.find((chip) => chip.id === 'chip-trade-help')
    const withoutLeagueTrade = withoutLeague.find((chip) => chip.id === 'chip-trade-help')

    expect(withLeagueTrade?.prompt).toContain('Alpha League')
    expect(withoutLeagueTrade?.prompt).not.toContain('Alpha League')

    const withLeagueDraft = withLeague.find((chip) => chip.id === 'chip-draft-help')
    const withoutLeagueDraft = withoutLeague.find((chip) => chip.id === 'chip-draft-help')

    expect(withLeagueDraft?.prompt).toContain('Alpha League')
    expect(withoutLeagueDraft?.prompt).not.toContain('Alpha League')
  })

  it('maps each chip category to a supported analytics topic', () => {
    const chips = getChimmyIntentChips({ leagueName: 'Alpha League' })

    expect(chips.map((chip) => chip.category)).toEqual([
      'trade',
      'start_sit',
      'waiver',
      'injury',
      'general',
      'draft',
      'commissioner',
    ])
  })
})
