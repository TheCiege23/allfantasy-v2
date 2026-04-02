'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import ChimmyChat from '@/app/components/ChimmyChat'
import type { UserLeague } from '../types'
import { LeagueListPanel } from './LeagueListPanel'

type AfSubTab = 'chimmy' | 'direct' | 'groups'

const AF_SUB_TABS: Array<{ id: AfSubTab; label: string }> = [
  { id: 'chimmy', label: '🤖 Chimmy' },
  { id: 'direct', label: '👤 Direct' },
  { id: 'groups', label: '👥 Groups' },
]

type RightControlPanelProps = {
  leagues: UserLeague[]
  loadingLeagues: boolean
  onImport: () => void
  /** e.g. close mobile sheet after navigation */
  onAfterLeagueNavigate?: () => void
}

export function RightControlPanel({ leagues, loadingLeagues, onImport, onAfterLeagueNavigate }: RightControlPanelProps) {
  const [afTab, setAfTab] = useState<AfSubTab>('chimmy')

  const openFullChimmy = () => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('af-dashboard-focus-left-chimmy'))
    window.dispatchEvent(new CustomEvent('af-dashboard-open-mobile-left'))
    const el = document.getElementById('dashboard-left-chat')
    if (el && el.offsetParent !== null) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-shrink-0 flex-col border-l border-white/[0.07] bg-[#0a0a1f] md:w-[300px]">
      <div className="flex h-[55%] min-h-0 flex-shrink-0 flex-col border-b border-white/[0.07]">
        <p className="flex-shrink-0 px-3 pt-2.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">AF Chat</p>

        <div className="flex flex-shrink-0 border-b border-white/[0.07]">
          {AF_SUB_TABS.map((tab) => {
            const isActive = afTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAfTab(tab.id)}
                className={`flex-1 py-2 text-center text-[10px] font-semibold transition-colors ${
                  isActive ? 'border-b-2 border-cyan-500 bg-white/[0.04] text-white' : 'text-white/40 hover:text-white/65'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {afTab === 'chimmy' ? (
            <div className="flex h-full min-h-0 flex-col gap-1 p-2">
              <button
                type="button"
                onClick={openFullChimmy}
                className="flex-shrink-0 self-end text-[10px] font-semibold text-cyan-400/90 transition hover:text-cyan-300"
              >
                Open full Chimmy →
              </button>
              <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-white/[0.06] bg-[#07071a]/80">
                <ChimmyChat embedded />
              </div>
            </div>
          ) : null}

          {afTab === 'direct' ? (
            <div className="flex h-full min-h-0 items-center justify-center px-4 text-center">
              <p className="text-[12px] text-white/35">No direct messages yet</p>
            </div>
          ) : null}

          {afTab === 'groups' ? (
            <div className="flex h-full min-h-0 items-center justify-center px-4 text-center">
              <p className="text-[12px] text-white/35">No group chats yet</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-white/[0.07] px-3 py-2">
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
        <div className="min-h-0 flex-1 overflow-hidden">
          <LeagueListPanel
            leagues={leagues}
            selectedId={null}
            onSelect={() => {
              onAfterLeagueNavigate?.()
            }}
            compact
            loading={loadingLeagues}
          />
        </div>
      </div>
    </div>
  )
}
