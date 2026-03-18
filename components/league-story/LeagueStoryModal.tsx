'use client'

import { useCallback, useState } from 'react'
import { LeagueStoryCard, LEAGUE_STORY_CARD_ID } from './LeagueStoryCard'
import { LeagueStoryShareBar } from './LeagueStoryShareBar'
import type { LeagueStoryPayload } from '@/lib/league-story-engine/types'

export interface LeagueStoryModalProps {
  leagueId: string
  leagueName: string
  week?: number
  season?: string
  sport?: string
  /** Pre-built payload (e.g. from client-side engine); if not provided, we create from context and call API */
  initialPayload?: LeagueStoryPayload | null
  onClose: () => void
  className?: string
}

export function LeagueStoryModal({
  leagueId,
  leagueName,
  week,
  season,
  sport,
  initialPayload = null,
  onClose,
  className = '',
}: LeagueStoryModalProps) {
  const [step, setStep] = useState<'creating' | 'sharing'>('creating')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState('')
  const [payload, setPayload] = useState<LeagueStoryPayload | null>(initialPayload ?? null)

  const createShare = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/share/league-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId,
          week,
          season,
          sport,
          ...(initialPayload && {
            customTitle: initialPayload.title,
            customNarrative: initialPayload.narrative,
            storyType: initialPayload.storyType,
          }),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Failed to create story share')
        return
      }
      setShareUrl(data.shareUrl || '')
      setPayload(data.payload || null)
      setStep('sharing')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [leagueId, leagueName, week, season, sport, initialPayload])

  if (step === 'sharing' && payload) {
    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 ${className}`}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="bg-zinc-900 rounded-2xl border border-zinc-700 p-6 max-w-full overflow-auto">
          <div className="flex justify-end mb-2">
            <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white text-sm">
              Close
            </button>
          </div>
          <div className="flex flex-col items-center gap-4">
            <LeagueStoryCard payload={payload} captureId={LEAGUE_STORY_CARD_ID} />
            <LeagueStoryShareBar payload={payload} shareUrl={shareUrl} />
          </div>
        </div>
      </div>
    )
  }

  const previewPayload: LeagueStoryPayload = payload ?? initialPayload ?? {
    storyType: 'league_spotlight',
    title: 'League spotlight',
    narrative: `${leagueName} — where every week brings new twists. Stay locked in for the playoff push.`,
    leagueId,
    leagueName,
    week,
    season,
    sport,
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 ${className}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-zinc-900 rounded-2xl border border-zinc-700 p-6 max-w-xl w-full max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-white">League story</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>
        <p className="text-sm text-zinc-400 mb-4">
          Generate a shareable story card for your league. Create a link and download the image.
        </p>
        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
        <div className="mb-4">
          <LeagueStoryCard payload={previewPayload} captureId={LEAGUE_STORY_CARD_ID} />
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={createShare}
          className="w-full rounded-xl bg-amber-600 text-white px-4 py-2.5 font-medium hover:bg-amber-500 disabled:opacity-60"
        >
          {loading ? 'Creating link…' : 'Create share link'}
        </button>
      </div>
    </div>
  )
}
