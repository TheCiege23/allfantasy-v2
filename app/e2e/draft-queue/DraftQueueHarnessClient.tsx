'use client'

import { useState } from 'react'
import { QueuePanel } from '@/components/app/draft-room/QueuePanel'
import type { QueueEntry } from '@/lib/live-draft-engine/types'

const INITIAL_QUEUE: QueueEntry[] = [
  { playerName: 'Queue Player One', position: 'RB', team: 'KC' },
  { playerName: 'Queue Player Two', position: 'WR', team: 'MIA' },
]

export function DraftQueueHarnessClient() {
  const [queue, setQueue] = useState<QueueEntry[]>(INITIAL_QUEUE)
  const [autoPickFromQueue, setAutoPickFromQueue] = useState(false)
  const [awayMode, setAwayMode] = useState(false)

  return (
    <main className="min-h-screen bg-[#0a0a0f] p-6 text-white">
      <h1 className="mb-4 text-xl font-semibold">E2E Draft Queue Harness</h1>
      <div className="max-w-xl">
        <QueuePanel
          queue={queue}
          canDraft={true}
          onRemove={(index) => setQueue((prev) => prev.filter((_, i) => i !== index))}
          onReorder={(fromIndex, toIndex) =>
            setQueue((prev) => {
              const next = [...prev]
              const [item] = next.splice(fromIndex, 1)
              next.splice(toIndex, 0, item)
              return next
            })
          }
          onDraftFromQueue={(entry) =>
            setQueue((prev) => prev.filter((item) => item.playerName !== entry.playerName))
          }
          autoPickFromQueue={autoPickFromQueue}
          onAutoPickFromQueueChange={setAutoPickFromQueue}
          awayMode={awayMode}
          onAwayModeChange={setAwayMode}
          nextQueuedAvailable={queue[0] ?? null}
        />
      </div>
    </main>
  )
}
