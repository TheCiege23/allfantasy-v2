import { describe, expect, it } from 'vitest'
import {
  collectDuplicatePlayerIssues,
  validateIrSectionAgainstLeague,
} from '@/lib/roster-lineup-engine/rosterValidationService'

describe('roster-lineup-engine validation', () => {
  it('collectDuplicatePlayerIssues detects duplicates across sections', () => {
    const issues = collectDuplicatePlayerIssues({
      lineup_sections: {
        starters: [{ id: 'p1', position: 'RB' }],
        bench: [{ id: 'p1', position: 'RB' }],
        ir: [],
        taxi: [],
        devy: [],
      },
    })
    expect(issues.some((i) => i.code === 'duplicate_player')).toBe(true)
  })

  it('validateIrSectionAgainstLeague rejects healthy player in IR when rules are strict', () => {
    const league = {
      irAllowOut: false,
      irAllowCovid: false,
      irAllowSuspended: false,
      irAllowNA: false,
      irAllowDNR: false,
      irAllowDoubtful: false,
    } as const
    const issues = validateIrSectionAgainstLeague(league as never, {
      lineup_sections: {
        starters: [],
        bench: [],
        ir: [{ id: 'x', position: 'WR', status: 'healthy' }],
        taxi: [],
        devy: [],
      },
    })
    expect(issues.length).toBeGreaterThan(0)
  })
})
