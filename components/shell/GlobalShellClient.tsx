"use client"

import { ResponsiveNavSystem } from "./ResponsiveNavSystem"

export interface GlobalShellClientProps {
  isAuthenticated: boolean
  isAdmin: boolean
  userLabel: string | null
  children: React.ReactNode
}

/**
 * Client wrapper for global shell: responsive nav (desktop bar + mobile drawer) + content.
 */
export function GlobalShellClient({
  isAuthenticated,
  isAdmin,
  userLabel,
  children,
}: GlobalShellClientProps) {
  return (
    <ResponsiveNavSystem
      isAuthenticated={isAuthenticated}
      isAdmin={isAdmin}
      userLabel={userLabel}
    >
      {children}
    </ResponsiveNavSystem>
  )
}
