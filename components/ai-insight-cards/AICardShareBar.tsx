'use client'

/**
 * Share bar for AI Insight Cards: download image + share to X, Instagram, Discord, Reddit.
 * Uses useAICardCapture for image; builds intent URLs and copyable captions per platform.
 */

import { useCallback, useState } from 'react'
import {
  buildAICardShareUrl,
  getAICardCaption,
  type AICardShareChannel,
  type AICardShareOptions,
} from '@/lib/ai-insight-cards/shareUrls'
import type { AICardPayload } from '@/lib/ai-insight-cards/types'
import { useAICardCapture } from '@/hooks/useAICardCapture'

export interface AICardShareBarProps {
  /** Card payload (used to build captions and share text) */
  payload: AICardPayload
  /** Optional share URL (e.g. /share/xxx) */
  shareUrl?: string
  /** Optional hashtags */
  hashtags?: string[]
  /** Called when user requests download */
  onDownload?: () => void
  /** Called when user copies caption */
  onCopy?: (channel: AICardShareChannel) => void
  className?: string
}

const CHANNELS: { id: AICardShareChannel; label: string; intentOnly?: boolean }[] = [
  { id: 'x', label: 'X' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'discord', label: 'Discord' },
  { id: 'reddit', label: 'Reddit' },
]

export function AICardShareBar({
  payload,
  shareUrl,
  hashtags,
  onDownload,
  onCopy,
  className = '',
}: AICardShareBarProps) {
  const [copied, setCopied] = useState<AICardShareChannel | null>(null)
  const { captureAndDownload } = useAICardCapture({ scale: 2 })

  const shareOptions: AICardShareOptions = {
    title: payload.title,
    insight: payload.insight,
    url: shareUrl,
    hashtags,
  }

  const handleDownload = useCallback(async () => {
    await captureAndDownload(`allfantasy-${payload.variant}-${Date.now()}.png`)
    onDownload?.()
  }, [captureAndDownload, payload.variant, onDownload])

  const copyCaption = useCallback(
    (channel: AICardShareChannel) => {
      const caption = getAICardCaption(channel, shareOptions)
      void navigator.clipboard.writeText(caption).then(() => {
        setCopied(channel)
        onCopy?.(channel)
        setTimeout(() => setCopied(null), 2000)
      })
    },
    [shareOptions, onCopy]
  )

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={handleDownload}
        className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition"
      >
        Download image
      </button>
      {CHANNELS.map(({ id, label }) => {
        const intentUrl = buildAICardShareUrl(id, shareOptions)
        const hasIntent = intentUrl.length > 0
        return (
          <div key={id} className="flex items-center gap-1">
            {hasIntent ? (
              <a
                href={intentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition"
              >
                Share to {label}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => copyCaption(id)}
                className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition"
              >
                {copied === id ? 'Copied!' : `Copy for ${label}`}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
