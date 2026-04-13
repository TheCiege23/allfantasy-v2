'use client'

import React from 'react'

export interface ChimmySurfaceShellProps {
  /** Whether to show a right rail layout on desktop */
  withRightRail?: boolean
  /** The right rail content (desktop only, hidden on mobile) */
  rightRail?: React.ReactNode
  children: React.ReactNode
  className?: string
}

/**
 * ChimmySurfaceShell — page-level layout wrapper for any AI surface.
 * On desktop: renders a main content area + optional right rail.
 * On mobile: stacks content only; right rail becomes drawer-accessible.
 */
export default function ChimmySurfaceShell({
  withRightRail = false,
  rightRail,
  children,
  className = '',
}: ChimmySurfaceShellProps) {
  if (withRightRail && rightRail) {
    return (
      <div className={`flex gap-6 ${className}`}>
        <div className="min-w-0 flex-1">{children}</div>
        <div className="hidden xl:block w-80 shrink-0">{rightRail}</div>
      </div>
    )
  }

  return <div className={className}>{children}</div>
}
