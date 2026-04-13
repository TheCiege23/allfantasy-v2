'use client'

import React from 'react'
import type { UserRole } from '@/lib/league-settings-engine/LeagueSettingsEngineTypes'
import { useAISurface } from './AISurfaceContext'

export interface ChimmyRoleGateProps {
  /** Roles that are allowed to see this content */
  allowedRoles: Array<UserRole | 'admin'>
  /** Rendered when the role is not allowed */
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * ChimmyRoleGate — renders children only when the current user's role
 * matches one of the allowed roles. Does not render a gate card; use
 * ChimmyUpgradeLockCard inside `fallback` if needed.
 */
export default function ChimmyRoleGate({ allowedRoles, fallback = null, children }: ChimmyRoleGateProps) {
  const { role } = useAISurface()

  if (!role) return null
  if (!allowedRoles.includes(role as UserRole | 'admin')) return <>{fallback}</>
  return <>{children}</>
}
