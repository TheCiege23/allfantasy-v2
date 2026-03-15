"use client"

import type { ReactNode } from "react"

export interface ShellLayoutContainerProps {
  children: ReactNode
  /** Max width class; default max-w-7xl */
  maxWidth?: "max-w-6xl" | "max-w-7xl" | "max-w-[1400px]"
  /** Extra class for the inner content */
  className?: string
}

/**
 * Consistent content container for shell content area: max-width, horizontal padding.
 */
export function ShellLayoutContainer({
  children,
  maxWidth = "max-w-7xl",
  className = "",
}: ShellLayoutContainerProps) {
  return (
    <div className={`mx-auto w-full ${maxWidth} px-4 sm:px-6 ${className}`.trim()}>
      {children}
    </div>
  )
}
