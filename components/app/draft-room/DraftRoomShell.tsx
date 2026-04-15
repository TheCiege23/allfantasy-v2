'use client'

import { type ReactNode } from 'react'
import { LayoutGrid, MessageCircle, ListOrdered, User, Sparkles, Users, Shield } from 'lucide-react'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

export type MobileDraftTab = 'board' | 'players' | 'queue' | 'helper' | 'roster' | 'keepers' | 'chat'

export type DraftRoomShellProps = {
  topBar: ReactNode
  managerStrip: ReactNode
  auctionStrip?: ReactNode
  draftBoard: ReactNode
  playerPanel: ReactNode
  queuePanel: ReactNode
  chatPanel: ReactNode
  helperPanel?: ReactNode
  rosterPanel?: ReactNode
  keeperPanel?: ReactNode
  mobileStickyBar?: ReactNode
  mobileTab: MobileDraftTab
  onMobileTabChange: (tab: MobileDraftTab) => void
  /**
   * Premium layout: top board, left team, center pool+queue, right AI, bottom chat+activity.
   * When set, desktop uses 4-zone + bottom dock; mobile tabs unchanged.
   */
  layout?: 'classic' | 'premium'
  /** Left column — your team / AI badges (desktop premium) */
  teamPanel?: ReactNode
  /** Center column — usually player pool + queue stacked */
  centerColumn?: ReactNode
  /** Bottom dock — chat + live pick feed side-by-side */
  bottomBar?: ReactNode
}

const MOBILE_TAB_I18N: Record<MobileDraftTab, string> = {
  board: 'draftRoom.shell.mobile.board',
  players: 'draftRoom.shell.mobile.players',
  queue: 'draftRoom.shell.mobile.queue',
  helper: 'draftRoom.shell.mobile.ai',
  roster: 'draftRoom.shell.mobile.roster',
  keepers: 'draftRoom.shell.mobile.keepers',
  chat: 'draftRoom.shell.mobile.chat',
}

const MOBILE_TABS = [
  { id: 'board' as const, icon: LayoutGrid },
  { id: 'players' as const, icon: User },
  { id: 'queue' as const, icon: ListOrdered },
  { id: 'helper' as const, icon: Sparkles },
  { id: 'roster' as const, icon: Users },
  { id: 'keepers' as const, icon: Shield },
  { id: 'chat' as const, icon: MessageCircle },
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
  layout = 'classic',
  teamPanel,
  centerColumn,
  bottomBar,
}: DraftRoomShellProps) {
  const { t } = useLanguage()
  const visibleTabs = MOBILE_TABS.filter(
    (tab) =>
      (tab.id !== 'helper' || helperPanel) &&
      (tab.id !== 'roster' || rosterPanel) &&
      (tab.id !== 'keepers' || keeperPanel)
  )

  const premiumDesktop =
    layout === 'premium' && teamPanel && centerColumn && bottomBar
  const centerMain = centerColumn ?? (
    <>
      <div className="min-h-0 flex-[3] overflow-hidden">{playerPanel}</div>
      <div className="min-h-[200px] flex-[2] overflow-auto border-t border-white/8 md:min-h-[220px]">{queuePanel}</div>
    </>
  )

  return (
    <div className="flex h-full min-h-[100dvh] flex-col bg-[#040915] text-white" data-testid="draft-room-shell">
      {topBar}
      {managerStrip}

      {/* Desktop — premium 4-zone + bottom dock */}
      {premiumDesktop ? (
        {/*
          Both desktop layout branches use the same `draft-desktop-layout`
          testid so e2e tests (draft-room, auction, c2c, devy, cpu-ai-drafter,
          draft-asset-pipeline, draft-import) can scope `.getByTestId('draft-board')`
          inside it regardless of which variant the parent picks. The premium
          variant is picked when layout="premium" plus teamPanel/centerColumn/
          bottomBar are all provided — otherwise we fall through to the legacy
          2-row layout below.
        */}
        <div className="hidden min-h-0 flex-1 flex-col overflow-hidden md:flex" data-testid="draft-desktop-layout">
          {auctionStrip && (
            <div className="shrink-0 border-b border-white/8 bg-[#060d1f]">{auctionStrip}</div>
          )}
          <div
            className="min-h-[160px] max-h-[min(42vh,520px)] shrink-0 overflow-auto border-b border-white/8 bg-[#050c1d]"
            data-testid="draft-premium-board-zone"
          >
            {draftBoard}
          </div>
          <div className="flex min-h-0 flex-1 overflow-hidden" data-testid="draft-premium-main-zones">
            <aside className="w-[min(280px,22vw)] shrink-0 overflow-y-auto border-r border-white/8 bg-[#050c1d]">
              {teamPanel}
            </aside>
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-white/8 bg-[#060d1e]">
              {centerMain}
            </div>
            {helperPanel && (
              <aside className="w-[min(400px,34vw)] shrink-0 overflow-y-auto bg-[#060d1e] shadow-[inset_1px_0_0_rgba(255,255,255,0.06)]">
                {helperPanel}
              </aside>
            )}
          </div>
          <div
            className="flex h-[min(220px,30vh)] min-h-[140px] shrink-0 overflow-hidden border-t border-white/10 bg-[#040915]"
            data-testid="draft-premium-bottom-dock"
          >
            {bottomBar}
          </div>
        </div>
      ) : (
        <div className="hidden min-h-0 flex-1 flex-col overflow-hidden md:flex" data-testid="draft-desktop-layout">
          {auctionStrip && <div className="shrink-0 border-b border-white/8 bg-[#060d1f]">{auctionStrip}</div>}
          <div className="min-h-[200px] flex-[2] overflow-auto border-b border-white/8 bg-[#050c1d]">{draftBoard}</div>
          <div className="flex min-h-[280px] flex-1 overflow-hidden">
            <div className="min-w-0 flex-[3] overflow-hidden border-r border-white/8">{playerPanel}</div>
            <div className="min-w-0 flex-[2] overflow-hidden border-r border-white/8">{queuePanel}</div>
            <div className="min-w-0 flex-[3] overflow-hidden">{chatPanel}</div>
          </div>
        </div>
      )}

      {/* Mobile */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:hidden" data-testid="draft-mobile-layout">
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
          {mobileStickyBar && (
            <div className="sticky top-0 z-10 shrink-0 border-b border-white/10 bg-[#040915]/95 backdrop-blur-sm">
              {mobileStickyBar}
            </div>
          )}
          {auctionStrip && mobileTab === 'board' && (
            <div className="shrink-0 border-b border-white/10 bg-[#050c1d]">{auctionStrip}</div>
          )}
          <div key={mobileTab} className="min-h-[220px] p-3 text-sm transition-opacity duration-150 sm:p-3.5">
            {mobileTab === 'board' && draftBoard}
            {mobileTab === 'players' && playerPanel}
            {mobileTab === 'queue' && queuePanel}
            {mobileTab === 'chat' && chatPanel}
            {helperPanel && mobileTab === 'helper' && helperPanel}
            {rosterPanel && mobileTab === 'roster' && rosterPanel}
            {keeperPanel && mobileTab === 'keepers' && keeperPanel}
          </div>
        </div>
        <nav
          className="safe-area-bottom flex shrink-0 border-t border-white/10 bg-[#070f21]/95"
          aria-label={t('draftRoom.shell.aria.draftSections')}
        >
          {visibleTabs.map(({ id, icon: Icon }) => {
            const label = t(MOBILE_TAB_I18N[id])
            return (
              <button
                key={id}
                type="button"
                onClick={() => onMobileTabChange(id)}
                data-testid={`draft-mobile-tab-${id}`}
                className={`flex min-h-[48px] flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] active:scale-[0.98] ${
                  mobileTab === id ? 'bg-cyan-500/10 text-cyan-200' : 'text-white/60'
                }`}
                aria-pressed={mobileTab === id}
                aria-label={label}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
