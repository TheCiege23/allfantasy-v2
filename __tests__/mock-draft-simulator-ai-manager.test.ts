import { describe, expect, it } from 'vitest'
import { makeAIPick } from '@/lib/mock-draft-simulator/DraftAIManager'

describe('DraftAIManager multi-sport behavior', () => {
  it('deprioritizes K/DEF in early football rounds', async () => {
    const pick = await makeAIPick({
      sport: 'NFL',
      managerName: 'CPU 1',
      rosterSoFar: [],
      availablePlayers: [
        { name: 'Elite Kicker', position: 'K', adp: 5, value: 95 },
        { name: 'Workhorse RB', position: 'RB', adp: 10, value: 90 },
      ],
      round: 2,
      overall: 16,
      slot: 4,
      numTeams: 12,
      draftType: 'snake',
      isSuperflex: false,
      useMeta: false,
    })

    expect(pick?.name).toBe('Workhorse RB')
  })

  it('normalizes MLB pitcher aliases to satisfy needs', async () => {
    const pick = await makeAIPick({
      sport: 'MLB',
      managerName: 'CPU 2',
      rosterSoFar: [
        { position: 'OF' },
        { position: 'OF' },
        { position: 'OF' },
        { position: '1B' },
        { position: '2B' },
        { position: '3B' },
        { position: 'SS' },
        { position: 'C' },
      ],
      availablePlayers: [
        { name: 'Ace Starter', position: 'SP', adp: 28, value: 80 },
        { name: 'Corner Outfielder', position: 'LF', adp: 20, value: 82 },
      ],
      round: 4,
      overall: 46,
      slot: 10,
      numTeams: 12,
      draftType: 'snake',
      isSuperflex: false,
      useMeta: false,
    })

    expect(pick?.name).toBe('Ace Starter')
  })

  it('uses basketball position targets for NBA/NCAAB drafts', async () => {
    const pick = await makeAIPick({
      sport: 'NCAAB',
      managerName: 'CPU 3',
      rosterSoFar: [
        { position: 'C' },
        { position: 'SF' },
        { position: 'PF' },
      ],
      availablePlayers: [
        { name: 'Floor General', position: 'PG', adp: 30, value: 78 },
        { name: 'Backup Big', position: 'C', adp: 18, value: 84 },
      ],
      round: 5,
      overall: 57,
      slot: 9,
      numTeams: 12,
      draftType: 'snake',
      isSuperflex: false,
      useMeta: false,
    })

    expect(pick?.name).toBe('Floor General')
  })
})
