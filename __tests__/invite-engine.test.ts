import { describe, expect, it } from 'vitest'
import {
  buildInviteDeepLink,
  buildInviteDestinationHref,
  buildInviteDestinationLabel,
  buildInviteShareTargets,
} from '@/lib/invite-engine/shareUrls'
import { buildInviteUrl, deriveInviteStatus } from '@/lib/invite-engine'

describe('invite engine helpers', () => {
  it('builds invite urls, deep links, and destination routes deterministically', () => {
    expect(buildInviteUrl('TOKEN142', 'https://allfantasy.test')).toBe(
      'https://allfantasy.test/invite/accept?code=TOKEN142'
    )
    expect(buildInviteDeepLink('TOKEN142')).toBe('allfantasy://invite/accept?code=TOKEN142')
    expect(buildInviteDestinationHref('league', 'league-1')).toBe('/leagues/league-1')
    expect(buildInviteDestinationHref('creator_league', 'creator-1')).toBe('/creator/leagues/creator-1')
    expect(buildInviteDestinationLabel('referral')).toBe('Open referrals')
  })

  it('returns external share urls and a manual Discord fallback', () => {
    const targets = buildInviteShareTargets('https://allfantasy.test/invite/accept?code=TOKEN142', {
      message: 'Join me on AllFantasy',
    })

    const discord = targets.find((target) => target.channel === 'discord')
    const sms = targets.find((target) => target.channel === 'sms')
    const whatsapp = targets.find((target) => target.channel === 'whatsapp')

    expect(discord).toMatchObject({
      action: 'manual_copy',
      href: null,
      supported: true,
    })
    expect(sms?.href).toContain('sms:?body=')
    expect(whatsapp?.href).toContain('wa.me')
  })

  it('derives invite lifecycle status from expiry and usage limits', () => {
    expect(
      deriveInviteStatus({
        status: 'active',
        expiresAt: new Date('2026-03-01T00:00:00.000Z'),
        now: new Date('2026-03-27T00:00:00.000Z'),
      })
    ).toBe('expired')

    expect(
      deriveInviteStatus({
        status: 'active',
        maxUses: 2,
        useCount: 2,
      })
    ).toBe('max_used')

    expect(
      deriveInviteStatus({
        status: 'revoked',
        maxUses: 10,
        useCount: 1,
      })
    ).toBe('revoked')
  })
})
