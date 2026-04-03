'use client'

import { useState } from 'react'
import { Bot, MessageCircle, Plus, Users, X } from 'lucide-react'
import { LeagueListPanel } from './LeagueListPanel'
import type { RightControlPanelLayoutProps, UserLeague } from '../types'

type AfExpand = 'direct' | 'groups' | 'chimmy' | null

export function RightControlPanel({
  leagues,
  leaguesLoading,
  selectedId,
  onSelectLeague,
  userId,
  onImport,
  onAfterLeagueNavigate,
}: RightControlPanelLayoutProps) {
  const [afExpanded, setAfExpanded] = useState<AfExpand>(null)

  const toggle = (tab: Exclude<AfExpand, null>) => {
    setAfExpanded((prev) => (prev === tab ? null : tab))
  }

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-x-hidden border-l border-white/[0.07] bg-[#0a0a1f]">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-w-0 flex-shrink-0 items-center justify-between gap-2 border-b border-white/[0.07] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">My Leagues</p>
          <button
            type="button"
            onClick={onImport}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
            aria-label="Import league"
            title="Import league"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <LeagueListPanel
            leagues={leagues}
            selectedId={selectedId}
            onSelect={(league: UserLeague) => {
              onSelectLeague(league)
              onAfterLeagueNavigate?.()
            }}
            compact
            loading={leaguesLoading}
          />
        </div>
      </div>

      <div
        className="flex h-12 max-h-12 min-h-[48px] shrink-0 items-center justify-around border-t border-white/[0.07] bg-[#0a0a1f] px-4 py-2"
        data-af-chat-user-id={userId}
      >
        <button
          type="button"
          onClick={() => toggle('direct')}
          className={`inline-flex items-center justify-center rounded-lg p-2 transition-colors ${
            afExpanded === 'direct' ? 'bg-white/[0.08] text-cyan-300' : 'text-white/50 hover:text-white/80'
          }`}
          title="Direct messages"
        >
          <MessageCircle className="h-5 w-5" aria-hidden />
          <span className="sr-only">Direct messages</span>
        </button>
        <button
          type="button"
          onClick={() => toggle('groups')}
          className={`inline-flex items-center justify-center rounded-lg p-2 transition-colors ${
            afExpanded === 'groups' ? 'bg-white/[0.08] text-cyan-300' : 'text-white/50 hover:text-white/80'
          }`}
          title="Group chats"
        >
          <Users className="h-5 w-5" aria-hidden />
          <span className="sr-only">Group chats</span>
        </button>
        <button
          type="button"
          onClick={() => {
            toggle('chimmy')
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('af-dashboard-focus-left-chimmy'))
              window.dispatchEvent(new CustomEvent('af-dashboard-open-mobile-left'))
            }
          }}
          className={`inline-flex items-center justify-center rounded-lg p-2 transition-colors ${
            afExpanded === 'chimmy' ? 'bg-white/[0.08] text-cyan-300' : 'text-white/50 hover:text-white/80'
          }`}
          title="Chimmy"
        >
          <Bot className="h-5 w-5" aria-hidden />
          <span className="sr-only">Chimmy</span>
        </button>
      </div>

      {afExpanded ? (
        <>
          <button
            type="button"
            className="absolute inset-x-0 top-0 bottom-12 z-10 bg-black/45"
            aria-label="Close panel"
            onClick={() => setAfExpanded(null)}
          />
          <div className="absolute bottom-12 left-0 right-0 z-20 flex max-h-[min(40vh,280px)] min-h-[140px] flex-col border-t border-white/[0.07] bg-[#0c0c1e] shadow-[0_-12px_40px_rgba(0,0,0,0.45)]">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-white/[0.07] px-3 py-2">
              <p className="text-xs font-semibold text-white/85">
                {afExpanded === 'direct'
                  ? 'Direct messages'
                  : afExpanded === 'groups'
                    ? 'Group chats'
                    : 'Chimmy'}
              </p>
              <button
                type="button"
                onClick={() => setAfExpanded(null)}
                className="rounded-lg p-1.5 text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-6 text-center text-[13px] text-white/40">
              {afExpanded === 'direct' ? <p>No direct messages yet</p> : null}
              {afExpanded === 'groups' ? <p>No group chats yet</p> : null}
              {afExpanded === 'chimmy' ? (
                <p>Open the left panel and select the Chimmy tab for the full assistant.</p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
