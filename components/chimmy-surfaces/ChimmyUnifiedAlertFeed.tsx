'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChimmyAlert, ChimmyAlertSignalBundle } from '@/lib/chimmy-alerts'
import ChimmyAlertBanner from './ChimmyAlertBanner'
import ChimmyGroupedAlertCard from './ChimmyGroupedAlertCard'
import ChimmyCommissionerAlertCard from './ChimmyCommissionerAlertCard'
import ChimmyFloatingNudge from './ChimmyFloatingNudge'
import ChimmyCriticalAlertDrawer from './ChimmyCriticalAlertDrawer'

interface UnifiedAlertResponse {
  ok: boolean
  alerts: ChimmyAlert[]
}

export interface ChimmyUnifiedAlertFeedProps {
  leagueId?: string
  surface?: string
  signalBundle?: ChimmyAlertSignalBundle
  presentation?: 'feed' | 'inline_banner' | 'floating_nudge' | 'critical_drawer'
  className?: string
}

export default function ChimmyUnifiedAlertFeed({
  leagueId,
  surface,
  signalBundle,
  presentation = 'feed',
  className = '',
}: ChimmyUnifiedAlertFeedProps) {
  const [alerts, setAlerts] = useState<ChimmyAlert[]>([])
  const [criticalOpen, setCriticalOpen] = useState(true)

  const fetchAlerts = useCallback(async () => {
    const response = await fetch('/api/ai/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ leagueId, surface, signalBundle }),
    })

    if (!response.ok) return
    const payload = (await response.json()) as UnifiedAlertResponse
    if (!payload.ok) return

    setAlerts(payload.alerts)

    for (const alert of payload.alerts) {
      void fetch('/api/ai/alerts/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId: alert.alertId,
          dedupeKey: alert.dedupeKey,
          event: 'shown',
          metadata: { surface },
        }),
      })
    }
  }, [leagueId, signalBundle, surface])

  useEffect(() => {
    void fetchAlerts()
  }, [fetchAlerts])

  const sortedAlerts = useMemo(() => {
    const rank: Record<ChimmyAlert['severity'], number> = {
      critical: 4,
      urgent: 3,
      action_recommended: 2,
      informational: 1,
    }
    return [...alerts].sort((a, b) => {
      const bySeverity = rank[b.severity] - rank[a.severity]
      if (bySeverity !== 0) return bySeverity
      return b.urgencyScore - a.urgencyScore
    })
  }, [alerts])

  const grouped = useMemo(() => {
    const map = new Map<string, ChimmyAlert[]>()
    for (const alert of sortedAlerts) {
      const key = alert.class
      const list = map.get(key) ?? []
      list.push(alert)
      map.set(key, list)
    }
    return map
  }, [sortedAlerts])

  const onSnooze = async (alert: ChimmyAlert) => {
    await fetch('/api/ai/alerts/lifecycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId: alert.alertId, dedupeKey: alert.dedupeKey, event: 'snoozed' }),
    })
    setAlerts((prev) => prev.filter((a) => a.alertId !== alert.alertId))
  }

  const onDismiss = async (alert: ChimmyAlert) => {
    await fetch('/api/ai/alerts/lifecycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId: alert.alertId, dedupeKey: alert.dedupeKey, event: 'dismissed' }),
    })
    setAlerts((prev) => prev.filter((a) => a.alertId !== alert.alertId))
  }

  const onClicked = async (alert: ChimmyAlert) => {
    await fetch('/api/ai/alerts/lifecycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId: alert.alertId, dedupeKey: alert.dedupeKey, event: 'clicked' }),
    })
  }

  const onAcknowledgeCritical = async (alert: ChimmyAlert) => {
    await onClicked(alert)
    setCriticalOpen(false)
  }

  const primaryInline = sortedAlerts[0]
  const primaryNudge = sortedAlerts.find((a) => a.severity !== 'informational')
  const criticalAlert = sortedAlerts.find((a) => a.severity === 'critical' || (a.severity === 'urgent' && a.urgencyScore >= 85))

  if (sortedAlerts.length === 0) return null

  if (presentation === 'inline_banner' && primaryInline) {
    const action = primaryInline.actions[0]
    const variant =
      primaryInline.severity === 'critical'
        ? 'error'
        : primaryInline.severity === 'urgent'
          ? 'warning'
          : primaryInline.severity === 'action_recommended'
            ? 'info'
            : 'success'

    return (
      <ChimmyAlertBanner
        variant={variant}
        title={primaryInline.title}
        message={primaryInline.message}
        explanation={typeof primaryInline.metadata?.explanation === 'string' ? primaryInline.metadata.explanation : undefined}
        primaryActionLabel={action?.label}
        onPrimaryAction={() => void onClicked(primaryInline)}
        dismissible={primaryInline.dismissible}
        onDismiss={() => void onDismiss(primaryInline)}
        className={className}
      />
    )
  }

  if (presentation === 'floating_nudge' && primaryNudge) {
    return (
      <div className={`pointer-events-none ${className}`}>
        <ChimmyFloatingNudge
          alert={primaryNudge}
          onAction={(alert) => void onClicked(alert)}
          onDismiss={(alert) => void onDismiss(alert)}
        />
      </div>
    )
  }

  if (presentation === 'critical_drawer' && criticalAlert) {
    return (
      <ChimmyCriticalAlertDrawer
        open={criticalOpen}
        alert={criticalAlert}
        onAcknowledge={(alert) => void onAcknowledgeCritical(alert)}
        onDismiss={(alert) => void onDismiss(alert)}
      />
    )
  }

  if (presentation !== 'feed') return null

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from(grouped.entries()).map(([group, groupAlerts]) => {
        if (group === 'commissioner') {
          return groupAlerts.map((alert) => (
            <ChimmyCommissionerAlertCard key={alert.alertId} alert={alert} onSnooze={onSnooze} onDismiss={onDismiss} />
          ))
        }

        return (
          <ChimmyGroupedAlertCard
            key={group}
            groupTitle={group.replace('_', ' ')}
            alerts={groupAlerts}
            onSnooze={onSnooze}
            onDismiss={onDismiss}
          />
        )
      })}
    </div>
  )
}
