'use client'

import type { QueueEntry } from '@/lib/live-draft-engine/types'

/** Read-only queue strip — editing uses existing queue APIs in the full draft room. */
export function DraftQueue({ entries }: { entries: QueueEntry[] }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#070d18]/90" data-testid="draft-queue-preview">
      <div className="border-b border-white/[0.06] px-3 py-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">Your queue</p>
      </div>
      <ol className="max-h-40 divide-y divide-white/[0.05] overflow-y-auto">
        {entries.length === 0 ? (
          <li className="px-3 py-4 text-center text-[12px] text-white/40">Queue is empty</li>
        ) : (
          entries.map((e, i) => (
            <li key={`${e.playerName}-${i}`} className="px-3 py-2 text-[12px] text-white/85">
              <span className="mr-2 font-mono text-white/35">{i + 1}.</span>
              {e.playerName}{' '}
              <span className="text-white/45">
                {e.position}
                {e.team ? ` · ${e.team}` : ''}
              </span>
            </li>
          ))
        )}
      </ol>
    </div>
  )
}
