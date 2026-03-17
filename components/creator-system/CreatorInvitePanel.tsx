'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export interface CreatorInvitePanelProps {
  inviteUrl: string
  inviteCode?: string
  onCopy?: () => void
}

export function CreatorInvitePanel({ inviteUrl, inviteCode, onCopy }: CreatorInvitePanelProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode ? `${inviteUrl}${inviteUrl.includes('?') ? '&' : '?'}code=${inviteCode}` : inviteUrl).then(
      () => {
        setCopied(true)
        onCopy?.()
        setTimeout(() => setCopied(false), 2000)
      }
    ).catch(() => {})
  }

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}
    >
      <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
        Share invite link
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          readOnly
          value={inviteUrl}
          className="flex-1 min-w-[200px] rounded-lg border px-3 py-2 text-sm bg-transparent"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        />
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border px-3 py-2 text-sm font-medium inline-flex items-center gap-2 shrink-0"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {inviteCode && (
        <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
          Invite code: <code className="font-mono">{inviteCode}</code>
        </p>
      )}
    </div>
  )
}
