'use client'

import { useState } from 'react'
import { Copy, Check, Mail, MessageCircle, Share2 } from 'lucide-react'
import { buildInviteShareUrl, type InviteShareChannel } from '@/lib/invite-engine/shareUrls'

const DEFAULT_MESSAGE = 'Join me on AllFantasy – fantasy tools, brackets, and AI advice!'

const CHANNELS: { key: InviteShareChannel; label: string; icon: typeof Copy }[] = [
  { key: 'copy_link', label: 'Copy link', icon: Copy },
  { key: 'sms', label: 'SMS', icon: MessageCircle },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'twitter', label: 'X', icon: Share2 },
]

export interface ReferralShareBarProps {
  referralLink: string
  message?: string
  onShare?: (channel: InviteShareChannel) => void
  className?: string
}

export function ReferralShareBar({
  referralLink,
  message = DEFAULT_MESSAGE,
  onShare,
  className = '',
}: ReferralShareBarProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = (channel: InviteShareChannel) => {
    if (channel === 'copy_link') {
      navigator.clipboard.writeText(referralLink).then(() => {
        setCopied(true)
        onShare?.(channel)
        fetch('/api/referral/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel: 'copy_link' }),
        }).catch(() => {})
        setTimeout(() => setCopied(false), 2000)
      })
      return
    }
    const url = buildInviteShareUrl(referralLink, channel, { message })
    onShare?.(channel)
    fetch('/api/referral/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: channel === 'x' ? 'twitter' : channel }),
    }).catch(() => {})
    if (channel === 'email' || channel === 'sms') {
      window.location.href = url
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs font-medium mr-1" style={{ color: 'var(--muted)' }}>
        Share:
      </span>
      {CHANNELS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => handleShare(key)}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-premium focus-ring"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          {key === 'copy_link' && copied ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
          {key === 'copy_link' && copied ? 'Copied' : label}
        </button>
      ))}
    </div>
  )
}
