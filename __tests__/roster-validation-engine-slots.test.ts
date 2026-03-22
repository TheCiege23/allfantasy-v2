import { describe, expect, it } from 'vitest'
import { validateRoster } from '@/lib/roster-defaults/RosterValidationEngine'

describe('RosterValidationEngine unknown slot handling', () => {
  it('rejects assignments for slots not defined by soccer template', () => {
    const result = validateRoster(
      'SOCCER',
      [{ playerId: 'p1', position: 'DEF', slotName: 'TAXI' }]
    )

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Unknown slot: TAXI')
  })

  it('rejects assignments for slots not defined by nfl idp template', () => {
    const result = validateRoster(
      'NFL',
      [{ playerId: 'p1', position: 'LB', slotName: 'DST' }],
      'IDP'
    )

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Unknown slot: DST')
  })
})
