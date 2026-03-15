'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, BookOpen } from 'lucide-react'

interface DramaEventDetail {
  id: string
  leagueId: string
  headline: string
  summary: string | null
  dramaType: string
  dramaScore: number
  relatedManagerIds: string[]
  relatedTeamIds: string[]
  relatedMatchupId: string | null
  createdAt: string
}

export default function DramaEventDetailPage() {
  const params = useParams<{ leagueId: string; eventId: string }>()
  const leagueId = params?.leagueId ?? ''
  const eventId = params?.eventId ?? ''
  const [event, setEvent] = useState<DramaEventDetail | null>(null)
  const [narrative, setNarrative] = useState<string | null>(null)
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!leagueId || !eventId) return
    setLoading(true)
    setError(null)
    fetch(`/api/leagues/${encodeURIComponent(leagueId)}/drama/${encodeURIComponent(eventId)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) setEvent(data)
        else setError('Event not found')
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [leagueId, eventId])

  const tellStory = () => {
    if (!leagueId || !eventId) return
    setNarrative(null)
    setNarrativeLoading(true)
    fetch(`/api/leagues/${encodeURIComponent(leagueId)}/drama/tell-story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId }),
    })
      .then((r) => r.json())
      .then((data) => setNarrative(data?.narrative ?? 'No story available.'))
      .catch(() => setNarrative('Could not load story.'))
      .finally(() => setNarrativeLoading(false))
  }

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-sm text-white/50">Loading storyline…</p>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="space-y-4 p-4">
        <Link
          href={`/app/league/${leagueId}`}
          className="inline-flex items-center gap-1 text-sm text-cyan-300 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to league
        </Link>
        <p className="text-red-300">{error ?? 'Event not found'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto">
      <Link
        href={`/app/league/${leagueId}`}
        className="inline-flex items-center gap-1 text-sm text-cyan-300 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to league
      </Link>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-lg font-bold text-white">{event.headline}</h1>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 shrink-0">
            {event.dramaType}
          </span>
        </div>
        {event.summary && <p className="text-sm text-white/70">{event.summary}</p>}
        <p className="text-xs text-white/50">Drama score: {event.dramaScore.toFixed(0)}/100</p>
        {(event.relatedManagerIds?.length > 0 || event.relatedTeamIds?.length > 0) && (
          <div className="text-xs text-white/50">
            {event.relatedManagerIds?.length > 0 && (
              <p>Managers: {event.relatedManagerIds.join(', ')}</p>
            )}
            {event.relatedTeamIds?.length > 0 && (
              <p>Teams: {event.relatedTeamIds.join(', ')}</p>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={tellStory}
          disabled={narrativeLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
        >
          <BookOpen className="h-4 w-4" />
          {narrativeLoading ? 'Loading…' : 'Tell me the story'}
        </button>
        {narrative && (
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-sm text-white/80 leading-relaxed">{narrative}</p>
          </div>
        )}
      </div>
    </div>
  )
}
