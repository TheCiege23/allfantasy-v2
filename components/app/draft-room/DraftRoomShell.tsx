'use client'

import { type ReactNode } from 'react'
import { LayoutGrid, MessageCircle, ListOrdered, User, Sparkles, Users, Shield } from 'lucide-react'

export type MobileDraftTab = 'board' | 'players' | 'queue' | 'helper' | 'roster' | 'keepers' | 'chat'

export type DraftRoomShellProps = {
  topBar: ReactNode
  managerStrip: ReactNode
  /** Optional strip above board (e.g. auction spotlight) */
  auctionStrip?: ReactNode
  draftBoard: ReactNode
  playerPanel: ReactNode
  queuePanel: ReactNode
  chatPanel: ReactNode
  /** Optional AI draft helper panel (recommendation, Ask Chimmy) */
  helperPanel?: ReactNode
  /** Optional roster panel (my drafted players) for mobile tab */
  rosterPanel?: ReactNode
  /** Optional keeper panel (keeper draft) for mobile tab */
  keeperPanel?: ReactNode
  /** Optional sticky bar shown on mobile inside scroll area (e.g. current pick) */
  mobileStickyBar?: ReactNode
  mobileTab: MobileDraftTab
  onMobileTabChange: (tab: MobileDraftTab) => void
}

const MOBILE_TABS = [
  { id: 'board' as const, label: 'Board', icon: LayoutGrid },
  { id: 'players' as const, label: 'Players', icon: User },
  { id: 'queue' as const, label: 'Queue', icon: ListOrdered },
  { id: 'helper' as const, label: 'AI', icon: Sparkles },
  { id: 'roster' as const, label: 'Roster', icon: Users },
  { id: 'keepers' as const, label: 'Keepers', icon: Shield },
  { id: 'chat' as const, label: 'Chat', icon: MessageCircle },
]

export function DraftRoomShell({
  topBar,
  managerStrip,
  draftBoard,
  playerPanel,
  queuePanel,
  chatPanel,
  helperPanel,
  rosterPanel,
  keeperPanel,
  mobileStickyBar,
  auctionStrip,
  mobileTab,
  onMobileTabChange,
}: DraftRoomShellProps) {
  const visibleTabs = MOBILE_TABS.filter(
    (t) =>
      (t.id !== 'helper' || helperPanel) &&
      (t.id !== 'roster' || rosterPanel) &&
      (t.id !== 'keepers' || keeperPanel)
  )

  return (
    <div className="flex h-full flex-col bg-[#040915] text-white" data-testid="draft-room-shell">
      {topBar}
      {managerStrip}

      {/* Desktop layout */}
      <div className="hidden md:flex flex-1 flex-col overflow-hidden" data-testid="draft-desktop-layout">
        {auctionStrip && (
          <div className="shrink-0 border-b border-white/8 bg-[#060d1f]">
            {auctionStrip}
          </div>
        )}
        <div className="min-h-[200px] flex-[2] overflow-auto border-b border-white/8 bg-[#050c1d]">
          {draftBoard}
        </div>
        <div className="flex min-h-[280px] flex-1 overflow-hidden">
          <div className="min-w-0 flex-[3] overflow-hidden border-r border-white/8">
            {playerPanel}
          </div>
          <div className="min-w-0 flex-[2] overflow-hidden border-r border-white/8">
            {queuePanel}
          </div>
          <div className="min-w-0 flex-[3] overflow-hidden">
            {chatPanel}
          </div>
        </div>
      </div>

      {/* Mobile layout: sticky current-pick area + scrollable content + nav */}
      <div className="flex md:hidden flex-1 flex-col overflow-hidden" data-testid="draft-mobile-layout">
        <div className="flex-1 overflow-auto min-h-0 overscroll-contain">
          {mobileStickyBar && (
            <div className="sticky top-0 z-10 shrink-0 border-b border-white/10 bg-[#040915]/95 backdrop-blur-sm">
              {mobileStickyBar}
            </div>
          )}
          {auctionStrip && mobileTab === 'board' && (
            <div className="shrink-0 border-b border-white/10 bg-[#050c1d]">
              {auctionStrip}
            </div>
          )}
          <div className="p-2.5 sm:p-3 min-h-[200px] text-sm">
            {mobileTab === 'board' && draftBoard}
            {mobileTab === 'players' && playerPanel}
            {mobileTab === 'queue' && queuePanel}
            {mobileTab === 'chat' && chatPanel}
            {helperPanel && mobileTab === 'helper' && helperPanel}
            {rosterPanel && mobileTab === 'roster' && rosterPanel}
            {keeperPanel && mobileTab === 'keepers' && keeperPanel}
          </div>
        </div>
        <nav className="flex shrink-0 border-t border-white/10 bg-[#070f21]/95 safe-area-bottom" aria-label="Draft sections">
          {visibleTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onMobileTabChange(id)}
              data-testid={`draft-mobile-tab-${id}`}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[48px] py-2.5 text-[11px] touch-manipulation active:scale-[0.98] ${
                mobileTab === id ? 'text-cyan-200 bg-cyan-500/10' : 'text-white/60'
              }`}
              aria-pressed={mobileTab === id}
              aria-label={label}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
