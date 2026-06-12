'use client'

import type { ReactNode } from 'react'
import { Bot, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AppShellProps = {
  children: ReactNode
  /** Left column: typically `<LeftChatPanel … />` */
  leftPanel: ReactNode
  /** Right column: typically `<RightControlPanel … />` — hidden when `rightRailCollapsed` */
  rightPanel: ReactNode
  /** Merged onto the root layout div (e.g. `data-dashboard-user-id`) */
  rootProps?: React.HTMLAttributes<HTMLDivElement> & { 'data-dashboard-user-id'?: string }
  /** Desktop: collapse My Leagues rail — center column expands. */
  rightRailCollapsed?: boolean
  onRightRailExpand?: () => void
  /** e.g. league count — shown on the collapsed strip */
  rightRailCollapsedHint?: string
  /** Desktop: collapse left chat rail — center column expands. */
  leftRailCollapsed?: boolean
  onLeftRailExpand?: () => void
  onLeftRailCollapse?: () => void
  /**
   * When true, center column is transparent and side rails use glass (for `SpecialtyLeagueAtmosphere` behind shell).
   */
  immersive?: boolean
  /**
   * Root height: default full viewport. Use a calc when the shell is nested under `GlobalAppShell` (header + mobile tabs).
   */
  rootClassName?: string
  /**
   * Renders only the center `children` full width/height (no side chat / My Leagues rails).
   * Used when the same league hub is embedded in the dashboard center panel (see `?embed=1` on `/league/[id]`).
   */
  embedCenterOnly?: boolean
  /** Desktop shell preset. Balanced uses adjacent 40/30/30 columns for league/dashboard views. */
  layoutMode?: 'legacy-rail-clamp' | 'balanced-three-panel'
}

/**
 * Single source of truth for the 3-panel layout (chat | workspace | My Leagues).
 * Adjust widths only here so dashboard, league, and future pages stay aligned.
 */
export default function AppShell({
  children,
  leftPanel,
  rightPanel,
  rootProps,
  rightRailCollapsed = false,
  onRightRailExpand,
  rightRailCollapsedHint,
  leftRailCollapsed = false,
  onLeftRailExpand,
  onLeftRailCollapse,
  immersive = false,
  rootClassName,
  embedCenterOnly = false,
  layoutMode = 'legacy-rail-clamp',
}: AppShellProps) {
  if (embedCenterOnly) {
    return (
      <div
        className={cn(
          'flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden text-[var(--text)]',
          rootClassName ?? 'h-full',
        )}
        style={{ background: 'var(--bg)' }}
        data-af-embed-center="1"
        {...rootProps}
      >
        {children}
      </div>
    )
  }

  const leftRailClass = immersive
    ? 'border-r border-white/[0.08] bg-[#070b14]/80 backdrop-blur-xl'
    : 'border-[var(--border)]'
  const rightRailClass = immersive
    ? 'border-l border-white/[0.08] bg-[#070b14]/80 backdrop-blur-xl'
    : 'border-[var(--border)]'
  const centerBg = immersive ? { background: 'transparent' as const } : { background: 'var(--bg)' }
  const rootBg = immersive ? { background: 'transparent' as const } : { background: 'var(--bg)' }
  const balancedDesktopLayout = layoutMode === 'balanced-three-panel'

  // Build desktop grid-template-columns for balanced-three-panel based on collapse states
  const balancedDesktopColumns = (() => {
    if (!balancedDesktopLayout) return ''
    const leftCol = leftRailCollapsed ? '3rem' : 'minmax(280px,40fr)'
    const rightCol = rightRailCollapsed ? '3rem' : 'minmax(280px,30fr)'
    return `md:[grid-template-columns:${leftCol}_minmax(0,1fr)_${rightCol}]`
  })()

  return (
    <div
      className={cn(
        'w-full min-h-0 overflow-hidden text-[var(--text)]',
        rootClassName ?? 'h-screen',
        balancedDesktopLayout ? `grid grid-cols-1 ${balancedDesktopColumns}` : 'flex',
        immersive && 'relative z-[1]',
      )}
      style={rootBg}
      data-af-immersive={immersive ? '1' : undefined}
      data-af-layout-mode={balancedDesktopLayout ? 'balanced-three-panel' : 'legacy-rail-clamp'}
      data-af-left-collapsed={leftRailCollapsed ? '1' : undefined}
      data-af-right-collapsed={rightRailCollapsed ? '1' : undefined}
      {...rootProps}
    >
      {/* Left chat rail — slim strip when collapsed */}
      <aside
        className={cn(
          balancedDesktopLayout
            ? 'hidden h-full min-h-0 flex-col overflow-hidden md:flex md:min-w-0'
            : 'hidden h-full min-h-0 flex-shrink-0 flex-col overflow-hidden transition-[width] duration-200 ease-out md:flex md:w-[clamp(300px,24vw,360px)]',
          leftRailCollapsed ? 'w-12 max-w-[3rem]' : '',
          leftRailClass,
        )}
        style={immersive ? undefined : { background: 'var(--panel2)' }}
        data-testid="app-shell-left-rail"
      >
        {leftRailCollapsed ? (
          <div className="flex h-full w-full flex-col items-center gap-2 border-r border-white/[0.06] bg-[#0a0a1f] py-3">
            <button
              type="button"
              onClick={onLeftRailExpand}
              className="inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/80 transition hover:bg-white/[0.08]"
              aria-label="Open chat"
              title="Open chat"
              data-testid="chat-rail-expand"
            >
              <Bot className="h-5 w-5" aria-hidden />
            </button>
          </div>
        ) : (
          <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
            {onLeftRailCollapse ? (
              <button
                type="button"
                onClick={onLeftRailCollapse}
                className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.04] text-white/50 transition hover:bg-white/[0.08] hover:text-white/80"
                aria-label="Collapse chat"
                title="Collapse chat"
                data-testid="chat-rail-collapse"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
            {leftPanel}
          </div>
        )}
      </aside>

      {/* Center workspace — grows when side rails are collapsed */}
      <div
        className={cn(
          balancedDesktopLayout
            ? 'flex min-h-0 min-w-0 w-full flex-col overflow-hidden'
            : 'flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden transition-[flex] duration-200 ease-out',
          !balancedDesktopLayout && (rightRailCollapsed ? 'md:min-w-0 md:flex-1' : 'md:min-w-0 md:flex-1 xl:min-w-[640px]'),
        )}
        style={centerBg}
      >
        {children}
      </div>

      {/* Right: My Leagues — full strip or slim expand control */}
      <aside
        className={cn(
          balancedDesktopLayout
            ? 'hidden h-full min-h-0 overflow-hidden md:flex md:min-w-0'
            : 'hidden h-full min-h-0 flex-shrink-0 overflow-hidden transition-[width] duration-200 ease-out md:flex',
          rightRailCollapsed ? 'w-12 max-w-[3rem]' : balancedDesktopLayout ? 'w-full' : 'w-[clamp(280px,22vw,340px)]',
          rightRailClass,
        )}
        style={immersive ? undefined : { background: 'var(--panel2)' }}
        data-testid="app-shell-right-rail"
      >
        {rightRailCollapsed ? (
          <div className="flex h-full w-full flex-col items-center gap-2 border-l border-white/[0.06] bg-[#0a0a1f] py-3">
            <button
              type="button"
              onClick={onRightRailExpand}
              className="inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/80 transition hover:bg-white/[0.08]"
              aria-label="Expand My Leagues"
              title="Expand My Leagues"
              data-testid="myleagues-rail-expand"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            {rightRailCollapsedHint ? (
              <span
                className="max-w-[2.5rem] text-center text-[9px] font-bold uppercase leading-tight text-white/35 [writing-mode:vertical-rl] [text-orientation:mixed]"
                title={rightRailCollapsedHint}
              >
                {rightRailCollapsedHint}
              </span>
            ) : null}
          </div>
        ) : (
          rightPanel
        )}
      </aside>
    </div>
  )
}
