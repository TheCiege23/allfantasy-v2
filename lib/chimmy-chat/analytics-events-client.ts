import type { ChimmyAIAnalyticsIngressEvent } from '@/lib/chimmy-chat/analytics-events'
import type { ChimmyAssistantMode } from '@/lib/chimmy-chat/assistant-mode'

const ANALYTICS_CLIENT_TIMEOUT_MS = 1_500

export async function trackChimmyAIEvent(event: Omit<ChimmyAIAnalyticsIngressEvent, 'user_id'>): Promise<void> {
  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), ANALYTICS_CLIENT_TIMEOUT_MS)
  try {
    await fetch('/api/ai/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: true,
      signal: abortController.signal,
      body: JSON.stringify(event),
    })
  } catch {
    // Fail soft for analytics.
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function trackChimmyModeChangeEvent(args: {
  leagueId?: string | null
  surface: ChimmyAIAnalyticsIngressEvent['surface']
  mode: ChimmyAssistantMode
  topic?: ChimmyAIAnalyticsIngressEvent['topic']
  action?: string
  previousMode?: ChimmyAssistantMode
}): Promise<void> {
  await trackChimmyAIEvent({
    event_name: 'mode_change',
    league_id: args.leagueId ?? null,
    surface: args.surface,
    mode: args.mode,
    topic: args.topic,
    action: args.action ?? 'assistant_mode_changed',
    timestamp: new Date().toISOString(),
    metadata: {
      previousMode: args.previousMode ?? null,
    },
  })
}
