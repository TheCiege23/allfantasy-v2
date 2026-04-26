import { describe, expect, it } from 'vitest'

import { buildChimmyFeedbackEvent } from '@/lib/chimmy-chat/feedback-events'

describe('buildChimmyFeedbackEvent', () => {
  it('builds helpful feedback payload with thumbs_up action', () => {
    const event = buildChimmyFeedbackEvent({
      messageId: 'msg-1',
      feedback: 'helpful',
      leagueId: 'league-1',
      surface: 'league',
      mode: 'deep_analysis',
      source: 'messages_ai',
      topic: 'trade',
    })

    expect(event.event_name).toBe('feedback_submit')
    expect(event.action).toBe('thumbs_up')
    expect(event.league_id).toBe('league-1')
    expect(event.mode).toBe('deep_analysis')
    expect(event.topic).toBe('trade')
    expect(event.metadata).toMatchObject({
      messageId: 'msg-1',
      feedbackValue: 'helpful',
      assistantMode: 'deep_analysis',
      surface: 'league',
      source: 'messages_ai',
    })
  })

  it('builds unhelpful payload with thumbs_down and nullable fields', () => {
    const event = buildChimmyFeedbackEvent({
      messageId: 'msg-2',
      feedback: 'unhelpful',
      surface: 'dashboard',
      mode: 'fast_take',
    })

    expect(event.action).toBe('thumbs_down')
    expect(event.league_id).toBeNull()
    expect(event.topic).toBeUndefined()
    expect(event.metadata).toMatchObject({
      messageId: 'msg-2',
      feedbackValue: 'unhelpful',
      source: null,
    })
  })
})
