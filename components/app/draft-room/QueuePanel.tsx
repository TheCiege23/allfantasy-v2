'use client'

import { useState } from 'react'
import { ListOrdered, GripVertical, X, Zap, UserMinus, Play } from 'lucide-react'
import type { QueueEntry } from '@/lib/live-draft-engine/types'

export type QueuePanelProps = {
  queue: QueueEntry[]
  canDraft: boolean
  onRemove: (index: number) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onDraftFromQueue?: (entry: QueueEntry) => void
  onAiReorder?: () => void
  aiReorderLoading?: boolean
  autoPickFromQueue: boolean
  onAutoPickFromQueueChange: (value: boolean) => void
  awayMode: boolean
  onAwayModeChange: (value: boolean) => void
  /** Next available player in queue (for auto-pick) */
  nextQueuedAvailable?: QueueEntry | null
  /** Explanation from last AI reorder */
  aiReorderExplanation?: string | null
}

export function QueuePanel({
  queue,
  canDraft,
  onRemove,
  onReorder,
  onDraftFromQueue,
  onAiReorder,
  aiReorderLoading = false,
  autoPickFromQueue,
  onAutoPickFromQueueChange,
  awayMode,
  onAwayModeChange,
  nextQueuedAvailable,
  aiReorderExplanation,
}: QueuePanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-white/12 bg-black/25">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Queue</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-white/10 p-2.5">
        {onAiReorder && (
          <button
            type="button"
            onClick={onAiReorder}
            disabled={aiReorderLoading || queue.length < 2}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3 py-2.5 text-xs text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50 touch-manipulation"
          >
            <Zap className="h-3.5 w-3.5" />
            {aiReorderLoading ? 'Reordering…' : 'AI reorder'}
          </button>
        )}
        <label className="min-h-[44px] flex cursor-pointer items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 text-[11px] text-white/80 touch-manipulation">
          <input
            type="checkbox"
            checked={autoPickFromQueue}
            onChange={(e) => onAutoPickFromQueueChange(e.target.checked)}
            className="rounded border-white/20 w-4 h-4"
          />
          Auto-pick from queue
        </label>
        <label className="min-h-[44px] flex cursor-pointer items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 text-[11px] text-white/80 touch-manipulation">
          <input
            type="checkbox"
            checked={awayMode}
            onChange={(e) => onAwayModeChange(e.target.checked)}
            className="rounded border-white/20 w-4 h-4"
          />
          <UserMinus className="h-3.5 w-3.5" />
          Away mode
        </label>
      </div>
      {aiReorderExplanation && (
        <p className="border-b border-white/10 px-2 py-1.5 text-[10px] text-cyan-200/90" title="AI reorder explanation">
          {aiReorderExplanation}
        </p>
      )}
      <div className="flex-1 overflow-auto overscroll-contain p-2.5">
        {queue.length === 0 ? (
          <p className="py-4 text-center text-[10px] text-white/50">
            Queue is empty. Add players from the player list.
          </p>
        ) : (
          <ul className="space-y-2">
            {queue.map((entry, index) => (
              <li
                key={`${entry.playerName}-${index}`}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex != null && dragIndex !== index) {
                    onReorder(dragIndex, index)
                    setDragIndex(null)
                  }
                }}
                className={`flex items-center justify-between gap-2 rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-[11px] min-h-[52px] ${
                  dragIndex === index ? 'opacity-60' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-white/40 shrink-0 touch-none" aria-hidden><GripVertical className="h-4 w-4" /></span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{entry.playerName}</p>
                    <p className="text-[10px] text-white/55">{entry.position}{entry.team ? ` · ${entry.team}` : ''}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {canDraft && onDraftFromQueue && index === 0 && (
                    <button
                      type="button"
                      onClick={() => onDraftFromQueue(entry)}
                      className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/30 touch-manipulation"
                    >
                      <Play className="h-3.5 w-3.5" /> Draft
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white/80 touch-manipulation"
                    aria-label={`Remove ${entry.playerName} from queue`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
