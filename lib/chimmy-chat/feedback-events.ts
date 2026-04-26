import type { ChimmyAIAnalyticsIngressEvent } from '@/lib/chimmy-chat/analytics-events'
import type { ChimmyAssistantMode } from '@/lib/chimmy-chat/assistant-mode'

export type ChimmyFeedbackValue = 'helpful' | 'unhelpful'

export function buildChimmyFeedbackEvent(args: {
  messageId: string
  feedback: ChimmyFeedbackValue
  leagueId?: string | null
  surface: ChimmyAIAnalyticsIngressEvent['surface']
  mode: ChimmyAssistantMode
  source?: string | null
  topic?: ChimmyAIAnalyticsIngressEvent['topic']
}): Omit<ChimmyAIAnalyticsIngressEvent, 'user_id'> {
  return {
    event_name: 'feedback_submit',
    league_id: args.leagueId ?? null,
    surface: args.surface,
    mode: args.mode,
    topic: args.topic,
    action: args.feedback === 'helpful' ? 'thumbs_up' : 'thumbs_down',
    timestamp: new Date().toISOString(),
    metadata: {
      messageId: args.messageId,
      feedbackValue: args.feedback,
      assistantMode: args.mode,
      surface: args.surface,
      source: args.source ?? null,
    },
  }
}
