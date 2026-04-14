'use client'

/**
 * SaveRecommendationButton
 *
 * A bookmark toggle that appears on any Chimmy recommendation card.
 * When clicked while unsaved: calls POST /api/ai/saved-recommendations and
 * animates to a "saved" state.
 * When clicked while saved: calls DELETE to unsave.
 *
 * Usage:
 *   <SaveRecommendationButton
 *     payload={{
 *       title: "Start Jefferson over Cooper",
 *       summary: "...",
 *       recommendationType: "lineup",
 *       sport: "NFL",
 *       leagueType: "redraft",
 *       sourceSurface: "waiver_wire",
 *       recommendationPayload: { ... },
 *       explanation: "...",
 *     }}
 *     onSaved={(rec) => console.log('saved', rec.id)}
 *   />
 */

import { useState, useCallback } from 'react'
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react'
import { useSaveRecommendation } from '@/lib/saved-recommendations/useSavedRecommendations'
import type { SavePayload } from '@/lib/saved-recommendations/useSavedRecommendations'
import type { UnifiedSavedRecommendation } from '@/lib/chimmy-actions/AIActionModel'

export interface SaveRecommendationButtonProps {
  payload: SavePayload
  /** Pre-set this when the rec is already saved (e.g. rendered from saved list) */
  initialSavedId?: string | null
  size?: 'sm' | 'md'
  variant?: 'icon' | 'pill'
  onSaved?: (rec: UnifiedSavedRecommendation) => void
  onUnsaved?: (id: string) => void
  className?: string
}

export default function SaveRecommendationButton({
  payload,
  initialSavedId = null,
  size = 'sm',
  variant = 'icon',
  onSaved,
  onUnsaved,
  className = '',
}: SaveRecommendationButtonProps) {
  const [savedId, setSavedId] = useState<string | null>(initialSavedId)
  const [flash, setFlash] = useState(false)
  const { save, unsave, isSaving } = useSaveRecommendation()

  const isSaved = savedId !== null

  const handleClick = useCallback(async () => {
    if (isSaving) return

    if (isSaved && savedId) {
      const ok = await unsave(savedId)
      if (ok) {
        onUnsaved?.(savedId)
        setSavedId(null)
      }
    } else {
      const rec = await save(payload)
      if (rec) {
        setSavedId(rec.id)
        setFlash(true)
        setTimeout(() => setFlash(false), 1200)
        onSaved?.(rec)
      }
    }
  }, [isSaving, isSaved, savedId, unsave, save, payload, onSaved, onUnsaved])

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isSaving}
        aria-label={isSaved ? 'Unsave recommendation' : 'Save recommendation'}
        className={[
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition',
          isSaved
            ? 'border border-indigo-500/40 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25'
            : 'border border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white',
          flash ? 'scale-105' : 'scale-100',
          'disabled:opacity-50',
          className,
        ].join(' ')}
      >
        {isSaving ? (
          <Loader2 className={`${iconSize} animate-spin`} />
        ) : isSaved ? (
          <BookmarkCheck className={iconSize} />
        ) : (
          <Bookmark className={iconSize} />
        )}
        <span>{isSaved ? 'Saved' : 'Save'}</span>
      </button>
    )
  }

  // icon variant
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSaving}
      aria-label={isSaved ? 'Unsave recommendation' : 'Save recommendation'}
      title={isSaved ? 'Remove from saved' : 'Save for later'}
      className={[
        'inline-flex items-center justify-center rounded-lg p-1.5 transition',
        isSaved
          ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/15'
          : 'text-white/40 hover:text-white/80 hover:bg-white/10',
        flash ? 'scale-110' : 'scale-100',
        'disabled:opacity-50',
        className,
      ].join(' ')}
    >
      {isSaving ? (
        <Loader2 className={`${iconSize} animate-spin`} />
      ) : isSaved ? (
        <BookmarkCheck className={iconSize} />
      ) : (
        <Bookmark className={iconSize} />
      )}
    </button>
  )
}
