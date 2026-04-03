'use client'

import { useEffect, useMemo, useState } from 'react'
import ChimmyChat from '@/app/components/ChimmyChat'
import { LeagueChatInPanel } from './LeagueChatInPanel'
import { LeagueListPanel } from './LeagueListPanel'
import type { AFChatTab, UserLeague } from '../types'

type AFChatPanelProps = {
  selectedLeague: UserLeague | null
  userId: string
  leagues?: UserLeague[]
  onSelectLeague?: (league: UserLeague) => void
  loadingLeagues?: boolean
}

const CHAT_TABS: Array<{ id: AFChatTab; label: string }> = [
  { id: 'chimmy', label: '🤖 Chimmy' },
  { id: 'direct', label: '👤 Direct' },
  { id: 'af_huddle', label: 'AF Huddle' },
  { id: 'dms', label: 'DMs' },
  { id: 'league', label: '🏈 League' },
]

function EmptyTabState({
  icon,
  title,
  subtitle,
}: {
  icon: string
  title: string
  subtitle: string
}) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center px-6 text-center">
      <div>
        <div className="text-[24px]">{icon}</div>
        <p className="mt-3 text-[12px] font-semibold text-white/35">{title}</p>
        <p className="mt-1 text-[12px] text-white/30">{subtitle}</p>
      </div>
    </div>
  )
}

export function AFChatPanel({
  selectedLeague,
  userId,
  leagues = [],
  onSelectLeague,
  loadingLeagues = false,
}: AFChatPanelProps) {
  const [activeTab, setActiveTab] = useState<AFChatTab>(selectedLeague ? 'league' : 'chimmy')

  useEffect(() => {
    setActiveTab(selectedLeague ? 'league' : 'chimmy')
  }, [selectedLeague])

  const tabContent = useMemo(() => {
    if (activeTab === 'chimmy') {
      return (
        <div className="min-h-0 flex-1 overflow-hidden">
          <ChimmyChat />
        </div>
      )
    }

    if (activeTab === 'direct') {
      return (
        <EmptyTabState
          icon="💬"
          title="No direct messages yet"
          subtitle="Start a conversation with another manager"
        />
      )
    }

    if (activeTab === 'af_huddle') {
      return (
        <EmptyTabState
          icon="👥"
          title="No group chats yet"
          subtitle="Create a group with your league managers"
        />
      )
    }

    if (activeTab === 'dms') {
      return (
        <EmptyTabState
          icon="💬"
          title="No other DMs yet"
          subtitle="Start a conversation with a league member"
        />
      )
    }

    if (selectedLeague) {
      return (
        <LeagueChatInPanel
          selectedLeague={selectedLeague}
          userId={userId}
          onAskChimmy={() => setActiveTab('chimmy')}
        />
      )
    }

    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-[11px] text-white/30">
        Select a league to see its chat
      </div>
    )
  }, [activeTab, selectedLeague, userId])

  return (
    <div className="flex h-full w-[300px] flex-shrink-0 flex-col border-l border-white/[0.07] bg-[#0a0a1f]">
      <div className={`flex min-h-0 flex-col ${selectedLeague ? 'h-[calc(100%-200px)]' : 'h-full'}`}>
        <div className="flex border-b border-white/[0.07] bg-[#0a0a1f]">
          {CHAT_TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const isDisabled = tab.id === 'league' && selectedLeague === null

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (!isDisabled) {
                    setActiveTab(tab.id)
                  }
                }}
                className={`flex-1 py-2 text-center text-[11px] font-semibold transition-colors ${
                  isActive
                    ? 'border-b-2 border-cyan-500 bg-white/[0.04] text-white'
                    : 'text-white/40 hover:text-white/60'
                } ${isDisabled ? 'pointer-events-none opacity-30' : ''}`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="min-h-0 flex-1">{tabContent}</div>
      </div>

      {selectedLeague ? (
        <div className="h-[200px] flex-shrink-0 border-t border-white/[0.07]">
          <LeagueListPanel
            leagues={leagues}
            selectedId={selectedLeague.id}
            onSelect={onSelectLeague ?? (() => undefined)}
            compact
            loading={loadingLeagues}
          />
        </div>
      ) : null}
    </div>
  )
}
