'use client'

import { useCallback, useState } from 'react'
import html2canvas from 'html2canvas'
import { LEAGUE_STORY_CARD_ID } from './LeagueStoryCard'
import {
  buildLeagueStoryShareUrl,
  getLeagueStoryShareCopyText,
  type LeagueStoryShareChannel,
} from '@/lib/league-story-engine/shareUrls'
import type { LeagueStoryPayload } from '@/lib/league-story-engine/types'

const CHANNELS: { id: LeagueStoryShareChannel; label: string }[] = [
  { id: 'copy_link', label: 'Copy link' },
  { id: 'x', label: 'X' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'discord', label: 'Discord' },
]

export interface LeagueStoryShareBarProps {
  payload: LeagueStoryPayload
  shareUrl: string
  captureId?: string
  onDownload?: () => void
  onCopy?: (channel: LeagueStoryShareChannel) => void
  className?: string
}

export function LeagueStoryShareBar({
  payload,
  shareUrl,
  captureId = LEAGUE_STORY_CARD_ID,
  onDownload,
  onCopy,
  className = '',
}: LeagueStoryShareBarProps) {
  const [copied, setCopied] = useState<LeagueStoryShareChannel | null>(null)
  const [copyError, setCopyError] = useState<string | null>(null)

  const shareOptions = {
    title: payload.title,
    shareUrl,
    narrative: payload.narrative,
  }

  const captureAndDownload = useCallback(async () => {
    const el = document.getElementById(captureId)
    if (!el) return
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#0f172a',
        useCORS: true,
        logging: false,
      })
      const dataUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `allfantasy-story-${Date.now()}.png`
      a.click()
      onDownload?.()
    } catch {
      // ignore
    }
  }, [captureId, onDownload])

  const copyForChannel = useCallback(
    (channel: LeagueStoryShareChannel) => {
      const text = getLeagueStoryShareCopyText(channel, shareOptions)
      setCopyError(null)
      void navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopied(channel)
          onCopy?.(channel)
          setTimeout(() => setCopied(null), 2000)
        })
        .catch(() => {
          setCopyError('Unable to copy automatically in this browser context.')
        })
    },
    [shareOptions, onCopy]
  )

  return (
    <div data-testid="league-story-share-bar" className={`flex flex-wrap items-center gap-3 ${className}`}>
      <button
        type="button"
        data-testid="league-story-download-image-button"
        onClick={captureAndDownload}
        className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition"
      >
        Download image
      </button>
      {CHANNELS.map(({ id, label }) => {
        const intentUrl = buildLeagueStoryShareUrl(id, shareOptions)
        if (intentUrl) {
          return (
            <a
              key={id}
              data-testid={`league-story-share-${id}-button`}
              href={intentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition"
            >
              Share to {label}
            </a>
          )
        }
        return (
          <button
            key={id}
            type="button"
            data-testid={`league-story-share-${id}-button`}
            onClick={() => copyForChannel(id)}
            className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition"
          >
            {copied === id ? 'Copied!' : id === 'copy_link' ? 'Copy link' : `Copy for ${label}`}
          </button>
        )
      })}
      {copyError && (
        <p data-testid="league-story-share-copy-error" className="w-full text-xs text-amber-200">
          {copyError}
        </p>
      )}
    </div>
  )
}
