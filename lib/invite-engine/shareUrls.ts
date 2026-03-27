/**
 * Share URLs and deterministic invite helpers.
 * Safe for client usage.
 */

import type { InviteShareChannel, InviteShareTargetDto, InviteType } from './types'

export type { InviteShareChannel } from './types'

export function buildInviteShareUrl(
  inviteUrl: string,
  channel: InviteShareChannel,
  options?: { message?: string; subject?: string }
): string {
  const message = options?.message ?? 'Join me on AllFantasy!'
  const encodedUrl = encodeURIComponent(inviteUrl)
  const encodedText = encodeURIComponent(message)

  switch (channel) {
    case 'sms':
      return `sms:?body=${encodedText}%20${encodedUrl}`
    case 'email':
      return `mailto:?subject=${encodeURIComponent(options?.subject ?? 'Join me on AllFantasy')}&body=${encodedText}%0A%0A${encodedUrl}`
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
    case 'reddit':
      return `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedText}`
    case 'whatsapp':
      return `https://wa.me/?text=${encodedText}%20${encodedUrl}`
    case 'copy_link':
    case 'discord':
    default:
      return inviteUrl
  }
}

export function buildInviteDeepLink(token: string): string {
  return `allfantasy://invite/accept?code=${encodeURIComponent(token)}`
}

export function buildInviteDestinationHref(inviteType: InviteType, targetId?: string | null): string | null {
  if (!targetId && inviteType !== 'referral' && inviteType !== 'reactivation' && inviteType !== 'waitlist') {
    return null
  }

  switch (inviteType) {
    case 'league':
      return targetId ? `/leagues/${targetId}` : null
    case 'bracket':
      return targetId ? `/brackets/leagues/${targetId}` : null
    case 'creator_league':
      return targetId ? `/creator/leagues/${targetId}` : null
    case 'referral':
      return '/referrals'
    case 'reactivation':
      return '/dashboard'
    case 'waitlist':
      return '/signup'
    default:
      return null
  }
}

export function buildInviteDestinationLabel(inviteType: InviteType, targetId?: string | null): string | null {
  if (!targetId && inviteType !== 'referral' && inviteType !== 'reactivation' && inviteType !== 'waitlist') {
    return null
  }

  switch (inviteType) {
    case 'league':
      return 'Open league'
    case 'bracket':
      return 'Open bracket'
    case 'creator_league':
      return 'Open creator league'
    case 'referral':
      return 'Open referrals'
    case 'reactivation':
      return 'Open dashboard'
    case 'waitlist':
      return 'Open signup'
    default:
      return null
  }
}

export function buildInviteShareTargets(
  inviteUrl: string,
  options?: { message?: string; subject?: string }
): InviteShareTargetDto[] {
  const manualDiscordText = 'Copy the invite and paste it into Discord.'

  return [
    {
      channel: 'copy_link',
      label: 'Copy link',
      href: null,
      action: 'copy',
      supported: true,
      helperText: 'Copy the public invite link.',
    },
    {
      channel: 'sms',
      label: 'SMS',
      href: buildInviteShareUrl(inviteUrl, 'sms', options),
      action: 'external',
      supported: true,
      helperText: 'Open your device messaging app.',
    },
    {
      channel: 'email',
      label: 'Email',
      href: buildInviteShareUrl(inviteUrl, 'email', options),
      action: 'external',
      supported: true,
      helperText: 'Compose an email with the invite link.',
    },
    {
      channel: 'twitter',
      label: 'X',
      href: buildInviteShareUrl(inviteUrl, 'twitter', options),
      action: 'external',
      supported: true,
      helperText: 'Post the invite on X.',
    },
    {
      channel: 'discord',
      label: 'Discord',
      href: null,
      action: 'manual_copy',
      supported: true,
      helperText: manualDiscordText,
    },
    {
      channel: 'reddit',
      label: 'Reddit',
      href: buildInviteShareUrl(inviteUrl, 'reddit', options),
      action: 'external',
      supported: true,
      helperText: 'Create a Reddit post with the invite.',
    },
    {
      channel: 'whatsapp',
      label: 'WhatsApp',
      href: buildInviteShareUrl(inviteUrl, 'whatsapp', options),
      action: 'external',
      supported: true,
      helperText: 'Open WhatsApp web or the mobile app.',
    },
  ]
}
