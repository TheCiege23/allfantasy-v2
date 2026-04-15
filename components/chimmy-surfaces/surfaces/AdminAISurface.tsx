'use client'

import React from 'react'
import ChimmySurfaceShell from '../ChimmySurfaceShell'
import ChimmyInsightCard from '../ChimmyInsightCard'
import ChimmyAlertBanner from '../ChimmyAlertBanner'
import ChimmyThinkingState from '../ChimmyThinkingState'
import ChimmyEmptyState from '../ChimmyEmptyState'
import ChimmyRoleGate from '../ChimmyRoleGate'
import ChimmyLauncherButton from '../ChimmyLauncherButton'

export interface AdminAISurfaceProps {
  anomalies?: Array<{ id: string; title: string; summary: string; severity?: 'info' | 'warning' | 'critical' }>
  banners?: Array<{ id: string; message: string; severity?: 'info' | 'warning' | 'error' }>
  isLoading?: boolean
  onOpenChat?: () => void
  className?: string
}

export default function AdminAISurface({
  anomalies = [],
  banners = [],
  isLoading = false,
  onOpenChat,
  className = '',
}: AdminAISurfaceProps) {
  return (
    <ChimmyRoleGate allowedRoles={['admin']}>
      <ChimmySurfaceShell className={className}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Admin AI Monitor</h3>
          {onOpenChat && <ChimmyLauncherButton label="Admin AI" onClick={onOpenChat} />}
        </div>

        {banners.map((b) => (
          <ChimmyAlertBanner key={b.id} variant={b.severity as 'info' | 'warning' | 'error'} message={b.message} className="mb-2" />
        ))}

        {isLoading && <ChimmyThinkingState message="Scanning platform for anomalies…" />}

        {!isLoading && anomalies.length === 0 && (
          <ChimmyEmptyState title="No anomalies detected" message="Chimmy is continuously monitoring the platform for unusual patterns." />
        )}

        {!isLoading && anomalies.map((a) => (
          <ChimmyInsightCard
            key={a.id}
            title={a.title}
            summary={a.summary}
            severity={a.severity === 'critical' ? 'critical' : a.severity === 'warning' ? 'warning' : 'info'}
            className="mb-2"
          />
        ))}
      </ChimmySurfaceShell>
    </ChimmyRoleGate>
  )
}
