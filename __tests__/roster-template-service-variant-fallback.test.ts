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

  it('falls back to in-memory defaults when roster_templates schema is missing sportType column', async () => {
    const { getRosterTemplate } = await import('@/lib/multi-sport/RosterTemplateService')

    findUniqueMock.mockRejectedValueOnce(
      new Error(
        'Invalid `prisma.rosterTemplate.findUnique()` invocation: The column roster_templates.sportType does not exist in the current database.'
      )
    )

    const template = await getRosterTemplate('NFL', 'survivor')

    expect(template.templateId).toBe('default-NFL-survivor')
    expect(template.sportType).toBe('NFL')
    expect(template.slots.length).toBeGreaterThan(0)
  })

  it('uses devy dynasty fallback slots for NFL devy format', async () => {
    const { getRosterTemplate } = await import('@/lib/multi-sport/RosterTemplateService')

    const template = await getRosterTemplate('NFL', 'devy_dynasty')

    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sportType_formatType: {
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
