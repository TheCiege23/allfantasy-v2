import { describe, expect, it } from 'vitest'
import { buildSurvivorAccessContextFromSnapshot } from '@/lib/survivor/survivorAccessControl'

describe('Survivor access control', () => {
  it('allows a non-playing commissioner host to see operational hidden state', () => {
    const access = buildSurvivorAccessContextFromSnapshot({
      leagueId: 'league-1',
      userId: 'commish',
      role: 'commissioner',
      settings: { commissionerParticipationMode: 'non_participating_host' },
      player: null,
      roster: null,
    })

    expect(access.isNonParticipatingCommissionerHost).toBe(true)
    expect(access.isParticipatingCommissioner).toBe(false)
    expect(access.decisions.canSeeHiddenIdolAssignments).toBe(true)
    expect(access.decisions.canSeePrivateVotes).toBe(true)
    expect(access.decisions.canPerformSensitiveHostAction).toBe(true)
  })

  it('treats a playing commissioner as a normal player for hidden information', () => {
    const access = buildSurvivorAccessContextFromSnapshot({
      leagueId: 'league-1',
      userId: 'commish',
      role: 'commissioner',
      settings: { commissionerParticipationMode: 'participating_player' },
      player: {
        userId: 'commish',
        playerState: 'active',
        tribeId: 'tribe-a',
        redraftRosterId: 'roster-a',
        canAccessTribeChat: true,
      },
      roster: { id: 'roster-a' },
    })

    expect(access.isCommissionerParticipating).toBe(true)
    expect(access.isParticipatingCommissioner).toBe(true)
    expect(access.decisions.canSeeHiddenIdolAssignments).toBe(false)
    expect(access.decisions.canSeePrivateVotes).toBe(false)
    expect(access.decisions.canPerformAdminAction).toBe(true)
    expect(access.decisions.canPerformSensitiveHostAction).toBe(false)
    expect(access.privacyWarnings.join(' ')).toContain('Playing commissioners')
  })

  it('never grants private DMs to hosts unless they are channel members', () => {
    const access = buildSurvivorAccessContextFromSnapshot({
      leagueId: 'league-1',
      userId: 'host',
      role: 'commissioner',
      settings: {},
    })

    expect(access.decisions.canSeePrivateUserDm).toBe(false)
  })
})
