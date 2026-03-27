import { describe, expect, it } from 'vitest'
import { buildSharePayload } from '@/lib/share-engine/SharePayloadBuilder'
import { buildShareTargetDescriptors, getPlatformShareUrl } from '@/lib/share-engine/shareUrls'

describe('share engine', () => {
  it('hides private league details for invite-only league shares', () => {
    const payload = buildSharePayload(
      {
        kind: 'league_invite',
        url: '/invite/accept?code=PRIVATE145',
        title: 'Diamond League invite',
        description: 'Join our private commissioner room.',
        leagueName: 'Diamond League',
        sport: 'NFL',
        visibility: 'invite_only',
        safeForPublic: false,
      },
      { baseUrl: 'https://allfantasy.test' }
    )

    expect(payload.url).toBe('https://allfantasy.test/invite/accept?code=PRIVATE145')
    expect(payload.title).toBe('AllFantasy league invite')
    expect(payload.leagueName).toBeUndefined()
    expect(payload.safeForPublic).toBe(false)
    expect(payload.helperText).toContain('private league details hidden')
  })

  it('builds public creator league promo payloads with sport-aware public chips', () => {
    const payload = buildSharePayload(
      {
        kind: 'creator_league_promo',
        url: '/creator/leagues/alpha-room?join=ALPHA145',
        creatorName: 'Alpha Creator',
        leagueName: 'Alpha Room',
        sport: 'SOCCER',
        visibility: 'public',
        safeForPublic: true,
      },
      { baseUrl: 'https://allfantasy.test' }
    )

    expect(payload.url).toBe('https://allfantasy.test/creator/leagues/alpha-room?join=ALPHA145')
    expect(payload.title).toContain('Alpha Creator')
    expect(payload.creatorName).toBe('Alpha Creator')
    expect(payload.chips).toContain('SOCCER')
    expect(payload.chips).toContain('Public safe')
  })

  it('builds share targets with discord fallback and working platform URLs', () => {
    const payload = buildSharePayload(
      {
        kind: 'power_rankings',
        url: 'https://allfantasy.test/share/power-rankings',
        title: 'Sunday Legends power rankings',
        description: 'See who moved up this week.',
        leagueName: 'Sunday Legends',
        sport: 'MLB',
        visibility: 'public',
        safeForPublic: true,
      },
      { baseUrl: 'https://allfantasy.test' }
    )

    const targets = buildShareTargetDescriptors(payload)
    const discordTarget = targets.find((target) => target.destination === 'discord')
    const xUrl = getPlatformShareUrl('x', payload)
    const redditUrl = getPlatformShareUrl('reddit', payload)

    expect(discordTarget).toMatchObject({
      action: 'manual_copy',
      href: null,
    })
    expect(xUrl).toContain('twitter.com/intent/tweet')
    expect(redditUrl).toContain('reddit.com/submit')
  })
})
