'use client'

import type { ReactNode } from 'react'

export type AppShellProps = {
  children: ReactNode
  /** Left column: typically `<LeftChatPanel … />` */
  leftPanel: ReactNode
  /** Right column: typically `<RightControlPanel … />` */
  rightPanel: ReactNode
  /** Merged onto the root layout div (e.g. `data-dashboard-user-id`) */
  rootProps?: React.HTMLAttributes<HTMLDivElement> & { 'data-dashboard-user-id'?: string }
}

/**
 * Single source of truth for the 3-panel 35% / 35% / 30% layout.
 * Adjust widths only here so dashboard, league, and future pages stay aligned.
 */
export default function AppShell({ children, leftPanel, rightPanel, rootProps }: AppShellProps) {
  return (
    <div
      className="flex h-screen w-full overflow-hidden text-[var(--text)]"
      style={{ background: 'var(--bg)' }}
      {...rootProps}
    >
      {/* Left: 45% */}
      <aside
        className="hidden h-full w-[45%] min-h-0 flex-shrink-0 flex-col overflow-hidden border-r border-[var(--border)] md:flex"
        style={{ background: 'var(--panel2)' }}
      >
        {leftPanel}
      </aside>

      {/* Center: 35% */}
      <div
        className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden md:w-[35%] md:flex-none"
        style={{ background: 'var(--bg)' }}
      >
        {children}
      </div>

      {/* Right: 20% */}
      <aside
        className="hidden h-full w-[20%] min-w-0 max-w-[20%] flex-shrink-0 overflow-hidden border-l border-[var(--border)] md:flex"
        style={{ background: 'var(--panel2)' }}
      >
        {rightPanel}
      </aside>
    </div>
  )
}
