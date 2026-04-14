'use client'

/**
 * SavedRecommendationDetailModal
 *
 * Full detail view for a single saved recommendation. Shows:
 * - Full explanation
 * - Bound actions (execute buttons)
 * - Confidence + risk badges
 * - Stale comparison trigger
 * - Status management (act on, dismiss, archive)
 */

import { useState, useCallback } from 'react'
import {
  X,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ArchiveX,
  AlertTriangle,
  Zap,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
} from 'lucide-react'
import type { UnifiedSavedRecommendation, AIAction } from '@/lib/chimmy-actions/AIActionModel'
import { useUpdateRecommendationStatus } from '@/lib/saved-recommendations/useSavedRecommendations'
import { useSaveRecommendation } from '@/lib/saved-recommendations/useSavedRecommendations'
import ChimmyConfidenceBadge from './ChimmyConfidenceBadge'
import ChimmyRiskBadge from './ChimmyRiskBadge'
import SavedRecommendationStaleCompare from './SavedRecommendationStaleCompare'

const TYPE_LABELS: Record<string, string> = {
  waiver: 'Waiver Pick-Up',
  trade: 'Trade Evaluation',
  lineup: 'Lineup Advice',
  start_sit: 'Start / Sit',
  draft: 'Draft Recommendation',
  player_comparison: 'Player Comparison',
  matchup_simulation: 'Matchup Simulation',
  roster_strategy: 'Roster Strategy',
  story_draft: 'Story Draft',
  commissioner_announcement: 'Commissioner Note',
  league_health: 'League Health',
  general: 'General Advice',
}

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export interface SavedRecommendationDetailModalProps {
  rec: UnifiedSavedRecommendation
  onClose: () => void
  onDeleted?: (id: string) => void
  onStatusChanged?: (rec: UnifiedSavedRecommendation) => void
  /** If set, renders the compare panel inline */
  freshPayload?: Record<string, unknown> | null
  className?: string
}

export default function SavedRecommendationDetailModal({
  rec,
  onClose,
  onDeleted,
  onStatusChanged,
  freshPayload = null,
  className = '',
}: SavedRecommendationDetailModalProps) {
  const [expanded, setExpanded] = useState(true)
  const [showCompare, setShowCompare] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(rec.status)
  const [currentArchived, setCurrentArchived] = useState(rec.isArchived)

  const { updateStatus, archive, isUpdating } = useUpdateRecommendationStatus()
  const { unsave } = useSaveRecommendation()

  const handleMarkActedOn = useCallback(async () => {
    const ok = await updateStatus(rec.id, 'acted_on')
    if (ok) {
      setCurrentStatus('acted_on')
      onStatusChanged?.({ ...rec, status: 'acted_on' })
    }
  }, [rec, updateStatus, onStatusChanged])

  const handleDismiss = useCallback(async () => {
    const ok = await updateStatus(rec.id, 'dismissed')
    if (ok) {
      setCurrentStatus('dismissed')
      onStatusChanged?.({ ...rec, status: 'dismissed' })
    }
  }, [rec, updateStatus, onStatusChanged])

  const handleArchive = useCallback(async () => {
    const ok = await archive(rec.id, !currentArchived)
    if (ok) {
      setCurrentArchived(!currentArchived)
      onStatusChanged?.({ ...rec, isArchived: !currentArchived })
    }
  }, [rec, archive, currentArchived, onStatusChanged])

  const handleDelete = useCallback(async () => {
    const ok = await unsave(rec.id)
    if (ok) {
      onDeleted?.(rec.id)
      onClose()
    }
  }, [rec.id, unsave, onDeleted, onClose])

  const isStale = currentStatus === 'stale'
  const isActedOn = currentStatus === 'acted_on'
  const isDismissed = currentStatus === 'dismissed'

  const confidencePct = Math.round(rec.confidence * 100)
  const typeLabel = TYPE_LABELS[rec.recommendationType] ?? rec.recommendationType

  return (
    <div
      className={`flex flex-col h-full overflow-hidden bg-[#0d1117] text-white ${className}`}
      role="dialog"
      aria-labelledby="saved-rec-detail-title"
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-white/[0.08] shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-medium text-indigo-300 uppercase tracking-wide">
              {typeLabel}
            </span>
            {rec.sport && rec.sport !== 'all' && (
              <span className="text-[10px] text-white/35 uppercase">{rec.sport}</span>
            )}
            {isActedOn && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                <CheckCircle2 className="h-2.5 w-2.5" /> Done
              </span>
            )}
            {isStale && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">
                <AlertTriangle className="h-2.5 w-2.5" /> Stale
              </span>
            )}
          </div>
          <h2
            id="saved-rec-detail-title"
            className="text-base font-semibold leading-snug text-white"
          >
            {rec.title}
          </h2>
          <p className="mt-0.5 text-xs text-white/40">Saved {relativeTime(rec.createdAt)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 text-white/40 hover:text-white hover:bg-white/10 transition"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Stale notice */}
      {isStale && (
        <div className="mx-5 mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-sm font-medium text-amber-300">
              Chimmy&apos;s view has changed
            </span>
          </div>
          <p className="text-xs text-amber-200/70">
            This recommendation may no longer reflect current conditions. Compare it with
            current advice to see what changed.
          </p>
          {freshPayload && (
            <button
              type="button"
              onClick={() => setShowCompare((s) => !s)}
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 transition"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              {showCompare ? 'Hide' : 'Compare with current advice'}
            </button>
          )}
        </div>
      )}

      {/* Compare panel */}
      {showCompare && freshPayload && (
        <div className="mx-5 mt-3">
          <SavedRecommendationStaleCompare
            saved={rec}
            freshPayload={freshPayload}
          />
        </div>
      )}

      {/* Body — scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-5">
        {/* Confidence + risk */}
        {(confidencePct > 0 || rec.riskLevel) && (
          <div className="flex items-center gap-2 flex-wrap">
            {confidencePct > 0 && (
              <ChimmyConfidenceBadge pct={confidencePct} />
            )}
            {rec.riskLevel && (
              <ChimmyRiskBadge level={rec.riskLevel} />
            )}
          </div>
        )}

        {/* Summary */}
        <div>
          <p className="text-sm text-white/80 leading-relaxed">{rec.summary}</p>
        </div>

        {/* Full explanation (collapsible) */}
        {rec.explanation && rec.explanation !== rec.summary && (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03]">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-xs font-medium text-white/60 uppercase tracking-wide">
                Full Explanation
              </span>
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5 text-white/40" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-white/40" />
              )}
            </button>
            {expanded && (
              <div className="px-4 pb-4">
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                  {rec.explanation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {rec.actions.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-white/40 uppercase tracking-wide">
              Available Actions
            </p>
            <div className="flex flex-col gap-2">
              {rec.actions.map((action: AIAction) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{action.label}</p>
                    <p className="text-xs text-white/50 truncate">{action.description}</p>
                  </div>
                  {action.isAvailable ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shrink-0"
                    >
                      <Zap className="h-3 w-3" />
                      {action.label}
                    </button>
                  ) : (
                    <span className="text-xs text-white/30 shrink-0">
                      {action.disabledReason ?? 'Unavailable'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="shrink-0 border-t border-white/[0.08] px-5 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          {currentStatus === 'saved' && (
            <button
              type="button"
              onClick={handleMarkActedOn}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mark as Done
            </button>
          )}
          {currentStatus !== 'dismissed' && (
            <button
              type="button"
              onClick={handleDismiss}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/50 hover:text-white/80 hover:bg-white/10 transition disabled:opacity-50"
            >
              Dismiss
            </button>
          )}
          <button
            type="button"
            onClick={handleArchive}
            disabled={isUpdating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/50 hover:text-white/80 hover:bg-white/10 transition disabled:opacity-50"
          >
            <ArchiveX className="h-3.5 w-3.5" />
            {currentArchived ? 'Unarchive' : 'Archive'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isUpdating}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-transparent px-3 py-2 text-xs font-medium text-red-400/70 hover:bg-red-500/10 hover:text-red-300 transition disabled:opacity-50"
          >
            Unsave
          </button>
        </div>
      </div>
    </div>
  )
}
