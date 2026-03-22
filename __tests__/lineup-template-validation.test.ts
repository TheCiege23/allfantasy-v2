import { describe, expect, it } from 'vitest'
import {
  autoCorrectPlayerDataToTemplate,
  getSlotLimitsFromTemplate,
  validateRosterSectionsAgainstTemplate,
} from '@/lib/roster/LineupTemplateValidation'
import type { RosterTemplateDto } from '@/lib/multi-sport/RosterTemplateService'

const nflTemplate: RosterTemplateDto = {
  templateId: 'default-NFL-standard',
  sportType: 'NFL',
  name: 'Default NFL standard',
  formatType: 'standard',
  slots: [
    { slotName: 'QB', allowedPositions: ['QB'], starterCount: 1, benchCount: 0, reserveCount: 0, taxiCount: 0, devyCount: 0, isFlexibleSlot: false, slotOrder: 0 },
    { slotName: 'RB', allowedPositions: ['RB'], starterCount: 1, benchCount: 0, reserveCount: 0, taxiCount: 0, devyCount: 0, isFlexibleSlot: false, slotOrder: 1 },
    { slotName: 'WR', allowedPositions: ['WR'], starterCount: 1, benchCount: 0, reserveCount: 0, taxiCount: 0, devyCount: 0, isFlexibleSlot: false, slotOrder: 2 },
    { slotName: 'FLEX', allowedPositions: ['RB', 'WR', 'TE'], starterCount: 1, benchCount: 0, reserveCount: 0, taxiCount: 0, devyCount: 0, isFlexibleSlot: true, slotOrder: 3 },
    { slotName: 'BENCH', allowedPositions: ['QB', 'RB', 'WR', 'TE'], starterCount: 0, benchCount: 2, reserveCount: 0, taxiCount: 0, devyCount: 0, isFlexibleSlot: false, slotOrder: 4 },
    { slotName: 'IR', allowedPositions: ['*'], starterCount: 0, benchCount: 0, reserveCount: 1, taxiCount: 0, devyCount: 0, isFlexibleSlot: false, slotOrder: 5 },
  ],
}

describe('LineupTemplateValidation', () => {
  it('derives section limits from template', () => {
    const limits = getSlotLimitsFromTemplate(nflTemplate)
    expect(limits).toEqual({
      starters: 4,
      bench: 2,
      ir: 1,
      taxi: 0,
      devy: 0,
    })
  })

  it('flags ineligible starter positions', () => {
    const reason = validateRosterSectionsAgainstTemplate(
      {
        lineup_sections: {
          starters: [{ id: 'p1', position: 'QB' }, { id: 'p2', position: 'DE' }],
          bench: [],
          ir: [],
          taxi: [],
          devy: [],
        },
      },
      nflTemplate
    )
    expect(reason).toContain('Starter position DE is not eligible')
  })

  it('flags players in disabled sections (zero slot limits)', () => {
    const reason = validateRosterSectionsAgainstTemplate(
      {
        lineup_sections: {
          starters: [{ id: 'p1', position: 'QB' }],
          bench: [],
          ir: [],
          taxi: [{ id: 'p2', position: 'RB' }],
          devy: [],
        },
      },
      nflTemplate
    )
    expect(reason).toContain('TAXI has 1 players, max 0.')
  })

  it('auto-corrects starter eligibility and section overflows', () => {
    const source = {
      lineup_sections: {
        starters: [
          { id: 'p1', position: 'QB' },
          { id: 'p2', position: 'RB' },
          { id: 'p3', position: 'WR' },
          { id: 'p4', position: 'TE' },
          { id: 'p5', position: 'DE' },
        ],
        bench: [{ id: 'p6', position: 'WR' }, { id: 'p7', position: 'RB' }],
        ir: [{ id: 'p8', position: 'RB' }, { id: 'p9', position: 'WR' }],
        taxi: [{ id: 'p10', position: 'QB' }],
        devy: [],
      },
    }

    const { correctedPlayerData, droppedPlayerIds } = autoCorrectPlayerDataToTemplate(source, nflTemplate)
    const reason = validateRosterSectionsAgainstTemplate(correctedPlayerData, nflTemplate)

    expect(reason).toBeNull()
    expect(Array.isArray((correctedPlayerData as any).lineup_sections?.starters)).toBe(true)
    expect(((correctedPlayerData as any).lineup_sections?.starters ?? []).length).toBe(4)
    expect(((correctedPlayerData as any).lineup_sections?.bench ?? []).length).toBe(2)
    expect(((correctedPlayerData as any).lineup_sections?.ir ?? []).length).toBe(1)
    expect(((correctedPlayerData as any).lineup_sections?.taxi ?? []).length).toBe(0)
    expect(droppedPlayerIds.length).toBeGreaterThan(0)
  })
})
