'use client'

import { useEffect, useState } from 'react'
import ChimmyChat from '@/app/components/ChimmyChat'

type LeftTab = 'league' | 'chimmy' | 'groups'

type LeftChatPanelProps = {
  /** Unified league id when in league context; dashboard passes null */
  selectedLeagueId: string | null
  /** Anchor id for "Open full Chimmy" (omit in duplicate mobile instance) */
  rootId?: string | null
}

const TABS: Array<{ id: LeftTab; label: string }> = [
  { id: 'league', label: '🏈 League' },
  { id: 'chimmy', label: '🤖 Chimmy' },
  { id: 'groups', label: '👥 Groups' },
]

export function LeftChatPanel({ selectedLeagueId, rootId = 'dashboard-left-chat' }: LeftChatPanelProps) {
  const [activeTab, setActiveTab] = useState<LeftTab>('chimmy')
  const leagueDisabled = selectedLeagueId === null

  useEffect(() => {
    const focusChimmy = () => setActiveTab('chimmy')
    window.addEventListener('af-dashboard-focus-left-chimmy', focusChimmy)
    return () => window.removeEventListener('af-dashboard-focus-left-chimmy', focusChimmy)
  }, [])

  return (
    <div
      id={rootId ?? undefined}
      className="flex h-full min-h-0 w-full min-w-0 flex-shrink-0 flex-col border-r border-white/[0.07] bg-[#0a0a1f] md:w-[280px]"
    >
      <div className="flex flex-shrink-0 border-b border-white/[0.07]">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const isLeagueLocked = tab.id === 'league' && leagueDisabled

          return (
            <button
              key={tab.id}
              type="button"
              title={isLeagueLocked ? 'Select a league' : undefined}
              disabled={isLeagueLocked}
              onClick={() => {
                if (!isLeagueLocked) setActiveTab(tab.id)
              }}
              className={`flex-1 py-2.5 text-center text-[11px] font-semibold transition-colors ${
                isActive ? 'border-b-2 border-cyan-500 bg-white/[0.04] text-white' : 'text-white/40 hover:text-white/65'
              } ${isLeagueLocked ? 'cursor-not-allowed opacity-40' : ''}`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === 'chimmy' ? (
          <div className="flex h-full min-h-0 flex-col p-2">
            <p className="flex-shrink-0 px-1 pb-2 text-xs font-semibold tracking-tight text-white/85">Chimmy</p>
            <div className="min-h-0 flex-1 overflow-hidden">
              <ChimmyChat embedded />
            </div>
          </div>
        ) : null}

        {activeTab === 'groups' ? (
          <div className="flex h-full min-h-[120px] items-center justify-center px-4 text-center">
            <p className="text-[12px] text-white/35">No group chats yet</p>
          </div>
        ) : null}

        {activeTab === 'league' && selectedLeagueId ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-[12px] text-white/40">
            League chat opens when viewing a league workspace.
          </div>
        ) : null}
      </div>
    </div>
  )
}
