'use client'

import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
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
}: AppShellProps) {
  return (
    <div
      className="flex h-screen w-full overflow-hidden text-[var(--text)]"
      style={{ background: 'var(--bg)' }}
      {...rootProps}
    >
      {/* Left chat rail */}
      <aside
        className="hidden h-full w-[45%] min-h-0 flex-shrink-0 flex-col overflow-hidden border-r border-[var(--border)] transition-[width] duration-200 ease-out md:flex"
        style={{ background: 'var(--panel2)' }}
      >
        {leftPanel}
      </aside>

      {/* Center workspace — grows when right rail is collapsed */}
      <div
        className={cn(
          'flex min-h-0 min-w-0 w-full flex-col overflow-hidden transition-[flex] duration-200 ease-out',
          rightRailCollapsed ? 'md:min-w-0 md:flex-1' : 'md:w-[35%] md:flex-none',
        )}
        style={{ background: 'var(--bg)' }}
      >
        {children}
      </div>

      {/* Right: My Leagues — full strip or slim expand control */}
      <aside
        className={cn(
          'hidden h-full min-h-0 flex-shrink-0 overflow-hidden border-l border-[var(--border)] transition-[width] duration-200 ease-out md:flex',
          rightRailCollapsed ? 'w-12 max-w-[3rem]' : 'w-[20%] max-w-[20%]',
        )}
        style={{ background: 'var(--panel2)' }}
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
