'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChimmyAlert, ChimmyAlertSignalBundle } from '@/lib/chimmy-alerts'
import { normalizeAlertPreferenceForClient } from '@/lib/chimmy-personalization'
import { useChimmyPersonalization } from '@/lib/chimmy-personalization/useChimmyPersonalization'
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
  userPreferences?: {
    sensitivity?: 'low' | 'normal' | 'high'
  }
  presentation?: 'feed' | 'inline_banner' | 'floating_nudge' | 'critical_drawer'
  className?: string
}

export default function ChimmyUnifiedAlertFeed({
  leagueId,
  surface,
  signalBundle,
  userPreferences,
  presentation = 'feed',
  className = '',
}: ChimmyUnifiedAlertFeedProps) {
  const [alerts, setAlerts] = useState<ChimmyAlert[]>([])
  const [criticalOpen, setCriticalOpen] = useState(true)
  const { profile } = useChimmyPersonalization()

  const alertMode = useMemo<'minimal' | 'balanced' | 'aggressive'>(() => {
    if (!profile) return 'balanced'
    return normalizeAlertPreferenceForClient(profile.effective.alertPreference)
  }, [profile])

  const sensitivity = useMemo<'low' | 'normal' | 'high'>(() => {
    if (alertMode === 'minimal') return 'low'
    if (alertMode === 'aggressive') return 'high'
    return 'normal'
  }, [alertMode])

  const trackPersonalizationEvent = useCallback(async (type: 'alert_clicked' | 'alert_dismissed', metadata?: Record<string, unknown>) => {
    try {
      await fetch('/api/user/chimmy-personalization/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, metadata }),
      })
    } catch {
      // Non-blocking analytics event.
    }
  }, [])

  const fetchAlerts = useCallback(async () => {
    const response = await fetch('/api/ai/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        leagueId,
        surface,
        signalBundle,
        userPreferences: { sensitivity: userPreferences?.sensitivity ?? sensitivity },
      }),
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
  }, [leagueId, sensitivity, signalBundle, surface, userPreferences?.sensitivity])

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

  const visibleAlerts = useMemo(() => {
    if (alertMode === 'aggressive') return sortedAlerts
    if (alertMode === 'minimal') {
      return sortedAlerts
        .filter((alert) => alert.severity !== 'informational')
        .slice(0, 3)
    }
    return sortedAlerts
      .filter((alert) => alert.severity !== 'informational' || alert.urgencyScore >= 70)
      .slice(0, 6)
  }, [alertMode, sortedAlerts])

  const grouped = useMemo(() => {
    const map = new Map<string, ChimmyAlert[]>()
    for (const alert of visibleAlerts) {
      const key = alert.class
      const list = map.get(key) ?? []
      list.push(alert)
      map.set(key, list)
    }
    return map
  }, [visibleAlerts])

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
    void trackPersonalizationEvent('alert_dismissed', {
      alertId: alert.alertId,
      dedupeKey: alert.dedupeKey,
      surface,
    })
    setAlerts((prev) => prev.filter((a) => a.alertId !== alert.alertId))
  }

  const onClicked = async (alert: ChimmyAlert) => {
    await fetch('/api/ai/alerts/lifecycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId: alert.alertId, dedupeKey: alert.dedupeKey, event: 'clicked' }),
    })
    void trackPersonalizationEvent('alert_clicked', {
      alertId: alert.alertId,
      dedupeKey: alert.dedupeKey,
      surface,
    })
  }

  const onAcknowledgeCritical = async (alert: ChimmyAlert) => {
    await onClicked(alert)
    setCriticalOpen(false)
  }

  const primaryInline = visibleAlerts[0]
  const primaryNudge = visibleAlerts.find((a) => a.severity !== 'informational')
  const criticalAlert = visibleAlerts.find((a) => a.severity === 'critical' || (a.severity === 'urgent' && a.urgencyScore >= 85))

  if (visibleAlerts.length === 0) return null

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
