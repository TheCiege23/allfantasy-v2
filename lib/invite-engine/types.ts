/**
 * Viral Invite Engine (PROMPT 142) — types.
 */

export const INVITE_TYPES = [
  'league',
  'bracket',
  'creator_league',
  'referral',
  'reactivation',
  'waitlist',
] as const
export type InviteType = (typeof INVITE_TYPES)[number]

export const INVITE_STATUSES = ['active', 'expired', 'revoked', 'max_used'] as const
export type InviteStatus = (typeof INVITE_STATUSES)[number]

export const INVITE_EVENT_TYPES = [
  'viewed',
  'shared',
  'accepted',
  'expired_shown',
  'copy_link',
  'sms',
  'email',
  'twitter',
  'discord',
  'reddit',
  'whatsapp',
] as const
export type InviteEventType = (typeof INVITE_EVENT_TYPES)[number]

export interface InviteLinkDto {
  id: string
  type: string
  token: string
  createdByUserId: string
  targetId: string | null
  expiresAt: string | null
  maxUses: number
  useCount: number
  status: string
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  inviteUrl?: string
}

/** Public-safe preview for accept page (no PII). */
export interface InvitePreviewDto {
  inviteType: InviteType
  token: string
  title: string
  description: string | null
  targetId: string | null
  targetName: string | null
  sport: string | null
  memberCount: number | null
  maxMembers: number | null
  isFull: boolean
  expired: boolean
  status: 'valid' | 'expired' | 'full' | 'invalid' | 'already_member'
}
