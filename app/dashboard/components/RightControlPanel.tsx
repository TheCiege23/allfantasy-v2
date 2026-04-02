'use client'

import { Plus } from 'lucide-react'
import { AFChatDMPanel } from './AFChatDMPanel'
import { LeagueListPanel } from './LeagueListPanel'
import type { RightControlPanelLayoutProps, UserLeague } from '../types'

export function RightControlPanel({
  leagues,
  leaguesLoading,
  selectedId,
  onSelectLeague,
  userId,
  onImport,
  onAfterLeagueNavigate,
}: RightControlPanelLayoutProps) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-x-hidden border-l border-white/[0.07] bg-[#0a0a1f]">
      <div className="flex h-[55%] min-h-0 min-w-0 flex-shrink-0 flex-col overflow-hidden border-b border-white/[0.07]">
        <AFChatDMPanel userId={userId} />
      </div>

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
    </div>
  )
}
