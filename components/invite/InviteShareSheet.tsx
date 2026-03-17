'use client'

import { useState } from 'react'
import { Copy, Mail, MessageCircle, Share2 } from 'lucide-react'
import { buildInviteShareUrl, type InviteShareChannel } from '@/lib/invite-engine/shareUrls'
import { ShareModal } from '@/components/share'
import { useShareModal } from '@/hooks/useShareModal'
import type { ShareableKind } from '@/lib/share-engine/types'

export interface InviteShareSheetProps {
  inviteUrl: string
  inviteLinkId?: string
  token?: string
  message?: string
  onShare?: (channel: InviteShareChannel) => void
  /** Share kind for the premium share modal (e.g. league_invite, bracket_invite). */
  shareKind?: ShareableKind
}

const CHANNELS: { key: InviteShareChannel; label: string; icon: typeof Copy }[] = [
  { key: 'copy_link', label: 'Copy link', icon: Copy },
  { key: 'sms', label: 'SMS', icon: MessageCircle },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'twitter', label: 'X (Twitter)', icon: Share2 },
  { key: 'discord', label: 'Discord', icon: MessageCircle },
  { key: 'reddit', label: 'Reddit', icon: Share2 },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
]

export function InviteShareSheet({
  inviteUrl,
  inviteLinkId,
  token,
  message = 'Join me on AllFantasy!',
  onShare,
  shareKind = 'league_invite',
}: InviteShareSheetProps) {
  const [copied, setCopied] = useState(false)
  const shareModal = useShareModal()

  const handleShare = (channel: InviteShareChannel) => {
    if (channel === 'copy_link') {
      navigator.clipboard.writeText(inviteUrl).then(() => {
        setCopied(true)
        onShare?.('copy_link')
        fetch('/api/invite/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteLinkId, token, channel: 'copy_link' }),
        }).catch(() => {})
        setTimeout(() => setCopied(false), 2000)
      })
      return
    }
    const url = buildInviteShareUrl(inviteUrl, channel, { message })
    onShare?.(channel)
    fetch('/api/invite/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteLinkId, token, channel }),
    }).catch(() => {})
    if (channel === 'email' || channel === 'sms') {
      window.location.href = url
    } else if (channel === 'twitter' || channel === 'x' || channel === 'reddit' || channel === 'whatsapp') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const openPremiumShare = () => {
    shareModal.openShare({
      kind: shareKind,
      url: inviteUrl,
      title: 'Join me on AllFantasy!',
      description: message,
      cta: 'Copy link or share to your favorite app',
    })
  }

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}
    >
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
        Share invite
      </h3>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openPremiumShare}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        >
          <Share2 className="h-4 w-4" />
          Share (preview)
        </button>
        {CHANNELS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleShare(key)}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <Icon className="h-4 w-4" />
            {key === 'copy_link' && copied ? 'Copied!' : label}
          </button>
        ))}
      </div>
      {shareModal.hasPayload && (
        <ShareModal
          open={shareModal.open}
          onOpenChange={shareModal.onOpenChange}
          payload={shareModal.payload}
        />
      )}
    </div>
  )
}
