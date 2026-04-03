'use client'

import { useState } from 'react'

type Tab = 'queue' | 'roster' | 'chat'

type Props = {
  tab: Tab
  onTabChange?: (t: Tab) => void
  queueSlot: React.ReactNode
  rosterSlot: React.ReactNode
  chatSlot: React.ReactNode
}

export function DraftRightPanel({ tab, onTabChange, queueSlot, rosterSlot, chatSlot }: Props) {
  const [internal, setInternal] = useState<Tab>('queue')
  const active = onTabChange ? tab : internal
  const set = onTabChange ?? ((t: Tab) => setInternal(t))

  return (
    <div className="flex min-h-0 flex-1 flex-col border-l border-white/[0.08] bg-[#0f1521]">
      <div className="flex shrink-0 border-b border-white/[0.08]">
        {(['queue', 'roster', 'chat'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => set(t)}
            className={`flex-1 px-2 py-2 text-[11px] font-bold uppercase tracking-wide ${
              active === t ? 'border-b-2 border-[#00d4aa] text-[#00d4aa]' : 'text-white/45'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {active === 'queue' ? queueSlot : active === 'roster' ? rosterSlot : chatSlot}
      </div>
    </div>
  )
}

export { QueuePanel } from './QueuePanel'
export { RosterPanel } from './RosterPanel'
export { DraftChatPanel } from './DraftChatPanel'
