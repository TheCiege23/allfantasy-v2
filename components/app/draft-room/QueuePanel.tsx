'use client'

import { useState } from 'react'
import { ListOrdered, GripVertical, X, Zap, UserMinus, Play } from 'lucide-react'
import type { QueueEntry } from '@/lib/live-draft-engine/types'
import { DRAFT_ROOM } from '@/lib/analytics/eventNames'
import { sendProductAnalyticsBeacon } from '@/lib/analytics/client'

export type QueuePanelProps = {
  queue: QueueEntry[]
  playerMetaById?: Record<string, { headshotUrl?: string | null; teamLogoUrl?: string | null; adp?: number | null; rank?: number | null }>
  canDraft: boolean
  onRemove: (index: number) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onDraftFromQueue?: (entry: QueueEntry) => void
  onAiReorder?: () => void
  aiReorderLoading?: boolean
  aiReorderEnabled?: boolean
  onAiReorderEnabledChange?: (value: boolean) => void
  autoPickFromQueue: boolean
  onAutoPickFromQueueChange: (value: boolean) => void
  awayMode: boolean
  onAwayModeChange: (value: boolean) => void
  /** Next available player in queue (for auto-pick) */
  nextQueuedAvailable?: QueueEntry | null
  /** Explanation from last AI reorder */
  aiReorderExplanation?: string | null
  /** Execution mode metadata from backend */
  aiReorderExecutionMode?: string | null
  /** Global commissioner setting for allowing auto-pick behaviors */
  autoPickEnabled?: boolean
  /** When set, queue autopick/away/AI reorder emit product analytics beacons */
  analyticsLeagueId?: string
  presentationVariant?: 'default' | 'redraft_snake'
}

export function QueuePanel({
  queue,
  playerMetaById,
  canDraft,
  onRemove,
  onReorder,
  onDraftFromQueue,
  onAiReorder,
  aiReorderLoading = false,
  aiReorderEnabled = true,
  onAiReorderEnabledChange,
  autoPickFromQueue,
  onAutoPickFromQueueChange,
  awayMode,
  onAwayModeChange,
  nextQueuedAvailable,
  aiReorderExplanation,
  aiReorderExecutionMode,
  autoPickEnabled = true,
  analyticsLeagueId,
  presentationVariant = 'default',
}: QueuePanelProps) {
  const rs = presentationVariant === 'redraft_snake'
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const resolveMeta = (entry: QueueEntry) => {
    const fromMap =
      entry.playerId && playerMetaById ? playerMetaById[entry.playerId] : undefined
    const fromEntry = entry as QueueEntry & {
      headshotUrl?: string | null
      teamLogoUrl?: string | null
      adp?: number | null
      rank?: number | null
    }
    return {
      headshotUrl: fromMap?.headshotUrl ?? fromEntry.headshotUrl ?? null,
      teamLogoUrl: fromMap?.teamLogoUrl ?? fromEntry.teamLogoUrl ?? null,
      adp: fromMap?.adp ?? fromEntry.adp ?? null,
      rank: fromMap?.rank ?? fromEntry.rank ?? null,
    }
  }

  const formatNumber = (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value)) return null
    return Number.isInteger(value) ? `${value}` : value.toFixed(1)
  }

  return (
    <section
      className={`flex flex-col overflow-hidden rounded-xl border bg-[#060d1e] ${
        rs ? 'border-cyan-500/25 shadow-[0_12px_40px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.05)]' : 'border-white/10'
      }`}
      data-testid="draft-queue-panel"
    >
      <div className={`flex items-center justify-between gap-2 border-b px-3 py-2.5 ${rs ? 'border-cyan-500/15 bg-[linear-gradient(90deg,rgba(34,211,238,0.08),transparent)]' : 'border-white/8'}`}>
        <div className="flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Queue</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-white/8 p-2.5">
        {onAiReorder && (
          <>
            {onAiReorderEnabledChange && (
              <label className="min-h-[44px] flex cursor-pointer items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 text-[11px] text-cyan-100/85 touch-manipulation">
                <input
                  type="checkbox"
                  checked={aiReorderEnabled}
                  onChange={(e) => {
                    if (analyticsLeagueId) {
                      sendProductAnalyticsBeacon(DRAFT_ROOM.AI_REORDER_EXPLAIN_TOGGLE, {
                        leagueId: analyticsLeagueId,
                        enabled: e.target.checked,
                      })
                    }
                    onAiReorderEnabledChange(e.target.checked)
                  }}
                  data-testid="draft-queue-ai-reorder-toggle"
                  className="rounded border-cyan-300/40 w-4 h-4"
                />
                AI explanation for reorder
              </label>
            )}
            <button
              type="button"
              onClick={() => {
                if (analyticsLeagueId) {
                  sendProductAnalyticsBeacon(DRAFT_ROOM.AI_QUEUE_REORDER, {
                    leagueId: analyticsLeagueId,
                    queueLen: queue.length,
                  })
                }
                onAiReorder()
              }}
              disabled={aiReorderLoading || !aiReorderEnabled || queue.length < 2}
              data-testid="draft-queue-ai-reorder"
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-cyan-300/35 bg-cyan-500/10 px-3 py-2.5 text-xs text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50 touch-manipulation"
            >
              <Zap className="h-3.5 w-3.5" />
              {aiReorderLoading ? 'Reordering…' : 'Auto reorder'}
            </button>
          </>
        )}
        <label className="min-h-[44px] flex cursor-pointer items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 text-[11px] text-white/75 touch-manipulation">
          <input
            type="checkbox"
            checked={autoPickFromQueue}
            onChange={(e) => {
              if (analyticsLeagueId) {
                sendProductAnalyticsBeacon(DRAFT_ROOM.AUTOPICK_QUEUE, {
                  leagueId: analyticsLeagueId,
                  enabled: e.target.checked,
                })
              }
              onAutoPickFromQueueChange(e.target.checked)
            }}
            disabled={!autoPickEnabled}
            data-testid="draft-queue-autopick-toggle"
            className="rounded border-white/20 w-4 h-4"
          />
          Auto-pick from queue
        </label>
        <label className="min-h-[44px] flex cursor-pointer items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 text-[11px] text-white/75 touch-manipulation">
          <input
            type="checkbox"
            checked={awayMode}
            onChange={(e) => {
              if (analyticsLeagueId) {
                sendProductAnalyticsBeacon(DRAFT_ROOM.AWAY_MODE, {
                  leagueId: analyticsLeagueId,
                  enabled: e.target.checked,
                })
              }
              onAwayModeChange(e.target.checked)
            }}
            disabled={!autoPickEnabled}
            data-testid="draft-queue-away-toggle"
            className="rounded border-white/20 w-4 h-4"
          />
          <UserMinus className="h-3.5 w-3.5" />
          Away mode
        </label>
      </div>
      {!autoPickEnabled && (
        <p className="border-b border-white/8 px-2 py-1.5 text-[10px] text-amber-200/90" data-testid="draft-queue-autopick-disabled-note">
          Commissioner has disabled auto-pick for this draft.
        </p>
      )}
      {aiReorderExplanation && (
        <p className="border-b border-white/8 px-2 py-1.5 text-[10px] text-cyan-100/90" title="AI reorder explanation">
          {aiReorderExplanation}
        </p>
      )}
      {aiReorderExecutionMode && (
        <p className="border-b border-white/8 px-2 py-1.5 text-[10px] text-white/60" data-testid="draft-queue-execution-mode">
          Execution: {aiReorderExecutionMode === 'ai_explained' ? 'rules engine + AI explanation' : 'instant rules automation'}
        </p>
      )}
      <div className="flex-1 overflow-auto overscroll-contain p-2.5">
        {queue.length === 0 ? (
          <div className="space-y-2 rounded-xl border border-dashed border-cyan-400/25 bg-cyan-500/5 px-3 py-6 text-center">
            <p className={`text-[11px] font-semibold ${rs ? 'text-cyan-100/85' : 'text-white/75'}`}>Queue is empty</p>
            <p className="mx-auto max-w-[280px] text-[10px] leading-relaxed text-white/55">
              Build a 3-5 player lane so your draft stays fast when the clock turns to you.
            </p>
            <p className="mx-auto max-w-[280px] text-[10px] leading-relaxed text-white/42">
              Use + Queue from player rows, then drag or arrow reorder here.
            </p>
            {rs ? (
              <p className="text-[9px] text-white/35">
                Drag rows to reorder. AI reorder is optional — your order always wins on the clock.
              </p>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-2">
            {queue.map((entry, index) => {
              const meta = resolveMeta(entry)
              const adpText = formatNumber(meta.adp)
              const rankText = formatNumber(meta.rank)
              const avatar = meta.headshotUrl ?? meta.teamLogoUrl ?? null
              return (
              <li
                key={`${entry.playerName}-${entry.playerId ?? index}`}
                data-testid={`draft-queue-item-${index}`}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex != null && dragIndex !== index) {
                    onReorder(dragIndex, index)
                    setDragIndex(null)
                  }
                }}
                className={`flex items-center justify-between gap-2 rounded-xl border border-white/12 bg-[linear-gradient(180deg,rgba(10,18,40,0.94),rgba(7,14,30,0.98))] px-3 py-2.5 text-[11px] min-h-[58px] ${
                  dragIndex === index ? 'opacity-60' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-white/40 shrink-0 touch-none" aria-hidden><GripVertical className="h-4 w-4" /></span>
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/15 bg-[#111b33]">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={entry.playerName}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-cyan-100/80">
                        {entry.position?.slice(0, 2) || 'PL'}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{entry.playerName}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px]">
                      <span className="rounded border border-white/15 bg-white/5 px-1.5 py-[1px] text-white/75">
                        {entry.position}
                      </span>
                      {entry.team ? (
                        <span className="rounded border border-white/15 bg-white/5 px-1.5 py-[1px] text-white/65">{entry.team}</span>
                      ) : null}
                      {adpText ? (
                        <span className="rounded border border-cyan-300/35 bg-cyan-500/12 px-1.5 py-[1px] text-cyan-100">ADP {adpText}</span>
                      ) : null}
                      {rankText ? (
                        <span className="rounded border border-violet-300/30 bg-violet-500/10 px-1.5 py-[1px] text-violet-100">Rank {rankText}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onReorder(index, Math.max(0, index - 1))}
                    disabled={index === 0}
                    data-testid={`draft-queue-move-up-${index}`}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white/80 disabled:opacity-40 touch-manipulation"
                    aria-label={`Move ${entry.playerName} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => onReorder(index, Math.min(queue.length - 1, index + 1))}
                    disabled={index === queue.length - 1}
                    data-testid={`draft-queue-move-down-${index}`}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white/80 disabled:opacity-40 touch-manipulation"
                    aria-label={`Move ${entry.playerName} down`}
                  >
                    ↓
                  </button>
                  {canDraft && onDraftFromQueue && index === 0 && (
                    <button
                      type="button"
                      onClick={() => onDraftFromQueue(entry)}
                      data-testid="draft-queue-draft-button"
                    className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/35 bg-cyan-500/12 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-500/20 touch-manipulation"
                    >
                      <Play className="h-3.5 w-3.5" /> Draft
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    data-testid={`draft-queue-remove-${index}`}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white/80 touch-manipulation"
                    aria-label={`Remove ${entry.playerName} from queue`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            )})}
          </ul>
        )}
      </div>
    </section>
  )
}
