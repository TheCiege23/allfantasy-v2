import { beforeEach, describe, expect, it, vi } from 'vitest'

const findUniqueMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    rosterTemplate: {
      findUnique: findUniqueMock,
    },
  },
}))

describe('RosterTemplateService variant fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findUniqueMock.mockResolvedValue(null)
  })

  it('uses devy dynasty fallback slots for NFL devy format', async () => {
    const { getRosterTemplate } = await import('@/lib/multi-sport/RosterTemplateService')

    const template = await getRosterTemplate('NFL', 'devy_dynasty')

    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          uniq_roster_template_sport_format: {
            sportType: 'NFL',
            formatType: 'devy_dynasty',
          },
        },
      })
    )
    expect(template.slots.some((slot) => slot.slotName === 'SUPER_FLEX' && slot.starterCount > 0)).toBe(true)
    expect(template.slots.some((slot) => slot.slotName === 'TAXI' && slot.taxiCount > 0)).toBe(true)
    expect(template.slots.some((slot) => slot.slotName === 'DEVY' && slot.devyCount > 0)).toBe(true)
  })
})
