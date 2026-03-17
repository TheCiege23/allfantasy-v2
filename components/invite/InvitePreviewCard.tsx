'use client'

import Link from 'next/link'

export interface InvitePreviewCardProps {
  title: string
  description?: string | null
  targetName?: string | null
  sport?: string | null
  memberCount?: number | null
  maxMembers?: number | null
  isFull?: boolean
  expired?: boolean
  status: string
  acceptUrl: string
  inviteType?: string
}

export function InvitePreviewCard({
  title,
  description,
  targetName,
  sport,
  memberCount,
  maxMembers,
  isFull,
  expired,
  status,
  acceptUrl,
  inviteType,
}: InvitePreviewCardProps) {
  const invalid = status === 'invalid'
  const canAccept = !invalid && !expired && !isFull && status !== 'already_member'

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 60%, transparent)' }}
    >
      <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text)' }}>
        {title}
      </h2>
      {targetName && (
        <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>
          {targetName}
          {sport ? ` · ${sport}` : ''}
        </p>
      )}
      {description && (
        <p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>
          {description}
        </p>
      )}
      {memberCount != null && maxMembers != null && (
        <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
          {memberCount} / {maxMembers} members
        </p>
      )}

      {expired && (
        <p className="text-sm py-2 rounded-lg mb-3" style={{ color: 'var(--destructive)' }}>
          This invite has expired.
        </p>
      )}
      {isFull && !expired && (
        <p className="text-sm py-2 rounded-lg mb-3" style={{ color: 'var(--destructive)' }}>
          This league is full.
        </p>
      )}
      {status === 'already_member' && (
        <p className="text-sm py-2 mb-3" style={{ color: 'var(--muted)' }}>
          You’re already a member.
        </p>
      )}

      {canAccept && (
        <Link
          href={acceptUrl}
          className="inline-block rounded-xl py-2.5 px-4 text-sm font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--bg)' }}
        >
          Accept invite
        </Link>
      )}
      {invalid && (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Invalid invite link.
        </p>
      )}
    </div>
  )
}
