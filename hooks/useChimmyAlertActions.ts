'use client'

import { useCallback } from 'react'
import type { ChimmyAlert } from '@/lib/chimmy-alerts'

export type ChimmySnoozePreset = '15m' | '1h' | '4h' | '24h' | '7d'

export interface DismissOpts {
  muteType?: boolean
  muteClass?: boolean
}

async function callLifecycle(
  alert: ChimmyAlert,
  event: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  await fetch('/api/ai/alerts/lifecycle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      alertId: alert.alertId,
      dedupeKey: alert.dedupeKey,
      event,
      alertType: alert.type,
      alertClass: alert.class,
      ...extra,
    }),
  })
}

export function useChimmyAlertActions() {
  const dismiss = useCallback(
    (alert: ChimmyAlert, opts?: DismissOpts) =>
      callLifecycle(alert, 'dismissed', {
        muteType: opts?.muteType ?? false,
        muteClass: opts?.muteClass ?? false,
      }),
    [],
  )

  const snooze = useCallback(
    (alert: ChimmyAlert, duration: ChimmySnoozePreset = '1h') =>
      callLifecycle(alert, 'snoozed', { snoozeDuration: duration }),
    [],
  )

  const markDone = useCallback(
    (alert: ChimmyAlert) => callLifecycle(alert, 'acted_on'),
    [],
  )

  const markRead = useCallback(
    (alert: ChimmyAlert) => callLifecycle(alert, 'shown'),
    [],
  )

  return { dismiss, snooze, markDone, markRead }
}
