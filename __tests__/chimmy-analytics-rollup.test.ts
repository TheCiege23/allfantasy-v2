/**
 * Chimmy Phase 3 — Analytics Rollup Unit Tests
 *
 * Covers:
 *  - No raw prompt/response text ever returned
 *  - Aggregation groups correctly (surface, mode, topic, day)
 *  - Zero-safe output when no events exist
 *  - Date filtering validation (valid range, too-wide range, reversed range)
 *  - Invalid date ranges are rejected by parseDateRange
 *  - helpful_rate, chip_ctr, followup_ctr computed correctly
 *  - Unknown event names are filtered out (no pollution)
 *  - formatter_fallback and contract_validation_failed counted separately
 */

import { describe, expect, it } from 'vitest'
import {
  normaliseRow,
  buildChimmyKPIRollup,
  buildChimmyKPIRollupFromRaw,
  parseDateRange,
  type ChimmyRawEventRow,
  type ChimmyNormalisedEvent,
} from '@/lib/chimmy-chat/analytics-rollup'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<ChimmyRawEventRow> & { event: string }): ChimmyRawEventRow {
  return {
    event: overrides.event,
    meta: overrides.meta ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-04-01T12:00:00Z'),
  }
}

function makeNorm(overrides: Partial<ChimmyNormalisedEvent> & { event_name: string }): ChimmyNormalisedEvent {
  return {
    event_name: overrides.event_name,
    surface: overrides.surface ?? 'chimmy_chat',
    mode: overrides.mode ?? 'fast_take',
    topic: overrides.topic ?? null,
    follow_up_origin: overrides.follow_up_origin ?? null,
    feedback_action: overrides.feedback_action ?? null,
    date: overrides.date ?? '2026-04-01',
  }
}

const PERIOD = { from: '2026-04-01', to: '2026-04-07' }

// ---------------------------------------------------------------------------
// parseDateRange
// ---------------------------------------------------------------------------

describe('parseDateRange', () => {
  it('accepts valid date range', () => {
    const result = parseDateRange('2026-04-01', '2026-04-07')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.from.toISOString()).toBe('2026-04-01T00:00:00.000Z')
      expect(result.to.toISOString()).toBe('2026-04-07T23:59:59.999Z')
    }
  })

  it('rejects missing from', () => {
    const result = parseDateRange(null, '2026-04-07')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/from/)
  })

  it('rejects missing to', () => {
    const result = parseDateRange('2026-04-01', null)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/to/)
  })

  it('rejects non-ISO from', () => {
    const result = parseDateRange('April 1 2026', '2026-04-07')
    expect(result.ok).toBe(false)
  })

  it('rejects reversed range (from > to)', () => {
    const result = parseDateRange('2026-04-07', '2026-04-01')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/from must not be after/)
  })

  it('rejects range exceeding 366 days', () => {
    const result = parseDateRange('2024-01-01', '2026-01-10')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/366/)
  })

  it('accepts a same-day range', () => {
    const result = parseDateRange('2026-04-01', '2026-04-01')
    expect(result.ok).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// normaliseRow — no raw text leaked
// ---------------------------------------------------------------------------

describe('normaliseRow — safe field extraction', () => {
  it('extracts surface, mode, topic from meta', () => {
    const row = makeRow({
      event: 'message_send',
      meta: { surface: 'league', mode: 'deep_analysis', topic: 'trade', action: 'message_sent' },
      createdAt: new Date('2026-04-02T08:00:00Z'),
    })
    const norm = normaliseRow(row)
    expect(norm.surface).toBe('league')
    expect(norm.mode).toBe('deep_analysis')
    expect(norm.topic).toBe('trade')
    expect(norm.date).toBe('2026-04-02')
  })

  it('does not include prompt, response, content, or message text', () => {
    const row = makeRow({
      event: 'message_send',
      meta: {
        surface: 'chimmy_chat',
        mode: 'fast_take',
        // These would only be present if sanitization failed upstream — but rollup must never re-expose them
        metadata: {
          prompt: 'should not appear',
          rawResponse: 'should not appear',
          messageText: 'should not appear',
        },
      },
    })
    const norm = normaliseRow(row)
    const serialized = JSON.stringify(norm)
    expect(serialized).not.toContain('should not appear')
    expect(serialized).not.toContain('prompt')
    expect(serialized).not.toContain('rawResponse')
    expect(serialized).not.toContain('messageText')
  })

  it('extracts feedback_action from meta.action', () => {
    const row = makeRow({
      event: 'feedback_submit',
      meta: { surface: 'chimmy_chat', mode: 'fast_take', action: 'thumbs_up' },
    })
    const norm = normaliseRow(row)
    expect(norm.feedback_action).toBe('thumbs_up')
  })

  it('extracts follow_up_origin from nested metadata.promptOrigin', () => {
    const row = makeRow({
      event: 'followup_click',
      meta: { surface: 'chimmy_chat', mode: 'fast_take', action: 'followup_prompt_selected', metadata: { promptOrigin: 'intent_chip' } },
    })
    const norm = normaliseRow(row)
    expect(norm.follow_up_origin).toBe('intent_chip')
  })

  it('handles null meta gracefully', () => {
    const row = makeRow({ event: 'chip_click', meta: null })
    const norm = normaliseRow(row)
    expect(norm.surface).toBeNull()
    expect(norm.mode).toBeNull()
    expect(norm.topic).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// buildChimmyKPIRollup — zero-safe empty data
// ---------------------------------------------------------------------------

describe('buildChimmyKPIRollup — zero-safe output', () => {
  it('returns all zero totals for empty event list', () => {
    const rollup = buildChimmyKPIRollup([], PERIOD)
    expect(rollup.totals.messages_sent).toBe(0)
    expect(rollup.totals.responses_rendered).toBe(0)
    expect(rollup.totals.chip_clicks).toBe(0)
    expect(rollup.totals.followup_clicks).toBe(0)
    expect(rollup.totals.mode_changes).toBe(0)
    expect(rollup.totals.helpful).toBe(0)
    expect(rollup.totals.unhelpful).toBe(0)
    expect(rollup.totals.helpful_rate).toBeNull()
    expect(rollup.totals.chip_click_through_rate).toBeNull()
    expect(rollup.totals.followup_click_through_rate).toBeNull()
    expect(rollup.totals.formatter_fallback_count).toBe(0)
    expect(rollup.totals.contract_validation_failure_count).toBe(0)
    expect(rollup.by_surface).toHaveLength(0)
    expect(rollup.by_mode).toHaveLength(0)
    expect(rollup.by_topic).toHaveLength(0)
    expect(rollup.by_day).toHaveLength(0)
    expect(rollup.event_count).toBe(0)
  })

  it('returns correct period in output', () => {
    const rollup = buildChimmyKPIRollup([], PERIOD)
    expect(rollup.period.from).toBe('2026-04-01')
    expect(rollup.period.to).toBe('2026-04-07')
  })
})

// ---------------------------------------------------------------------------
// buildChimmyKPIRollup — aggregation correctness
// ---------------------------------------------------------------------------

describe('buildChimmyKPIRollup — total counts', () => {
  it('counts message_send and response_rendered correctly', () => {
    const events: ChimmyNormalisedEvent[] = [
      makeNorm({ event_name: 'message_send', surface: 'league' }),
      makeNorm({ event_name: 'message_send', surface: 'chimmy_chat' }),
      makeNorm({ event_name: 'response_rendered', surface: 'league' }),
    ]
    const rollup = buildChimmyKPIRollup(events, PERIOD)
    expect(rollup.totals.messages_sent).toBe(2)
    expect(rollup.totals.responses_rendered).toBe(1)
  })

  it('counts chip_click and followup_click', () => {
    const events: ChimmyNormalisedEvent[] = [
      makeNorm({ event_name: 'chip_click' }),
      makeNorm({ event_name: 'chip_click' }),
      makeNorm({ event_name: 'followup_click' }),
    ]
    const rollup = buildChimmyKPIRollup(events, PERIOD)
    expect(rollup.totals.chip_clicks).toBe(2)
    expect(rollup.totals.followup_clicks).toBe(1)
  })

  it('counts helpful and unhelpful from feedback_submit action', () => {
    const events: ChimmyNormalisedEvent[] = [
      makeNorm({ event_name: 'feedback_submit', feedback_action: 'thumbs_up' }),
      makeNorm({ event_name: 'feedback_submit', feedback_action: 'thumbs_up' }),
      makeNorm({ event_name: 'feedback_submit', feedback_action: 'thumbs_down' }),
    ]
    const rollup = buildChimmyKPIRollup(events, PERIOD)
    expect(rollup.totals.helpful).toBe(2)
    expect(rollup.totals.unhelpful).toBe(1)
  })

  it('counts formatter_fallback_used and contract_validation_failed', () => {
    const events: ChimmyNormalisedEvent[] = [
      makeNorm({ event_name: 'formatter_fallback_used' }),
      makeNorm({ event_name: 'formatter_fallback_used' }),
      makeNorm({ event_name: 'contract_validation_failed' }),
    ]
    const rollup = buildChimmyKPIRollup(events, PERIOD)
    expect(rollup.totals.formatter_fallback_count).toBe(2)
    expect(rollup.totals.contract_validation_failure_count).toBe(1)
  })

  it('counts mode_change', () => {
    const events: ChimmyNormalisedEvent[] = [
      makeNorm({ event_name: 'mode_change' }),
      makeNorm({ event_name: 'mode_change' }),
    ]
    const rollup = buildChimmyKPIRollup(events, PERIOD)
    expect(rollup.totals.mode_changes).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// buildChimmyKPIRollup — rates
// ---------------------------------------------------------------------------

describe('buildChimmyKPIRollup — computed rates', () => {
  it('computes helpful_rate correctly', () => {
    const events: ChimmyNormalisedEvent[] = [
      makeNorm({ event_name: 'feedback_submit', feedback_action: 'thumbs_up' }),
      makeNorm({ event_name: 'feedback_submit', feedback_action: 'thumbs_up' }),
      makeNorm({ event_name: 'feedback_submit', feedback_action: 'thumbs_down' }),
    ]
    const rollup = buildChimmyKPIRollup(events, PERIOD)
    expect(rollup.totals.helpful_rate).toBeCloseTo(2 / 3, 3)
  })

  it('returns null helpful_rate when no feedback events', () => {
    const events: ChimmyNormalisedEvent[] = [makeNorm({ event_name: 'message_send' })]
    const rollup = buildChimmyKPIRollup(events, PERIOD)
    expect(rollup.totals.helpful_rate).toBeNull()
  })

  it('computes chip_click_through_rate = chip_clicks / responses_rendered', () => {
    const events: ChimmyNormalisedEvent[] = [
      makeNorm({ event_name: 'response_rendered' }),
      makeNorm({ event_name: 'response_rendered' }),
      makeNorm({ event_name: 'chip_click' }),
    ]
    const rollup = buildChimmyKPIRollup(events, PERIOD)
    expect(rollup.totals.chip_click_through_rate).toBeCloseTo(0.5, 3)
  })

  it('returns null chip_ctr when no responses rendered', () => {
    const events: ChimmyNormalisedEvent[] = [makeNorm({ event_name: 'chip_click' })]
    const rollup = buildChimmyKPIRollup(events, PERIOD)
    expect(rollup.totals.chip_click_through_rate).toBeNull()
  })

  it('computes followup_click_through_rate correctly', () => {
    const events: ChimmyNormalisedEvent[] = [
      makeNorm({ event_name: 'response_rendered' }),
      makeNorm({ event_name: 'response_rendered' }),
      makeNorm({ event_name: 'response_rendered' }),
      makeNorm({ event_name: 'response_rendered' }),
      makeNorm({ event_name: 'followup_click' }),
    ]
    const rollup = buildChimmyKPIRollup(events, PERIOD)
    expect(rollup.totals.followup_click_through_rate).toBeCloseTo(0.25, 3)
  })
})

// ---------------------------------------------------------------------------
// buildChimmyKPIRollup — grouping by surface
// ---------------------------------------------------------------------------

describe('buildChimmyKPIRollup — grouping by surface', () => {
  it('groups events by surface correctly', () => {
    const events: ChimmyNormalisedEvent[] = [
      makeNorm({ event_name: 'message_send', surface: 'league' }),
      makeNorm({ event_name: 'message_send', surface: 'league' }),
      makeNorm({ event_name: 'message_send', surface: 'dashboard' }),
      makeNorm({ event_name: 'response_rendered', surface: 'league' }),
      makeNorm({ event_name: 'chip_click', surface: 'league' }),
      makeNorm({ event_name: 'feedback_submit', surface: 'league', feedback_action: 'thumbs_up' }),
    ]
    const rollup = buildChimmyKPIRollup(events, PERIOD)
    const league = rollup.by_surface.find((s) => s.surface === 'league')
    const dashboard = rollup.by_surface.find((s) => s.surface === 'dashboard')
    expect(league).toBeDefined()
    expect(league!.messages_sent).toBe(2)
    expect(league!.responses_rendered).toBe(1)
    expect(league!.chip_clicks).toBe(1)
    expect(league!.helpful).toBe(1)
    expect(dashboard!.messages_sent).toBe(1)
  })

  it('sorts by_surface descending by messages_sent', () => {
    const events: ChimmyNormalisedEvent[] = [
      makeNorm({ event_name: 'message_send', surface: 'league' }),
      makeNorm({ event_name: 'message_send', surface: 'league' }),
      makeNorm({ event_name: 'message_send', surface: 'league' }),
      makeNorm({ event_name: 'message_send', surface: 'dashboard' }),
    ]
    const rollup = buildChimmyKPIRollup(events, PERIOD)
    expect(rollup.by_surface[0].surface).toBe('league')
  })
})

// ---------------------------------------------------------------------------
// buildChimmyKPIRollup — grouping by mode
// ---------------------------------------------------------------------------

describe('buildChimmyKPIRollup — grouping by mode', () => {
  it('groups events by mode', () => {
    const events: ChimmyNormalisedEvent[] = [
      makeNorm({ event_name: 'message_send', mode: 'deep_analysis' }),
      makeNorm({ event_name: 'message_send', mode: 'fast_take' }),
      makeNorm({ event_name: 'message_send', mode: 'fast_take' }),
      makeNorm({ event_name: 'response_rendered', mode: 'deep_analysis' }),
    ]
    const rollup = buildChimmyKPIRollup(events, PERIOD)
    const deep = rollup.by_mode.find((m) => m.mode === 'deep_analysis')
    const fast = rollup.by_mode.find((m) => m.mode === 'fast_take')
    expect(deep!.messages_sent).toBe(1)
    expect(deep!.responses_rendered).toBe(1)
    expect(fast!.messages_sent).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// buildChimmyKPIRollup — grouping by topic
// ---------------------------------------------------------------------------

describe('buildChimmyKPIRollup — grouping by topic', () => {
  it('groups message_send and feedback by topic', () => {
    const events: ChimmyNormalisedEvent[] = [
      makeNorm({ event_name: 'message_send', topic: 'trade' }),
      makeNorm({ event_name: 'message_send', topic: 'trade' }),
      makeNorm({ event_name: 'message_send', topic: 'waiver' }),
      makeNorm({ event_name: 'feedback_submit', topic: 'trade', feedback_action: 'thumbs_up' }),
      makeNorm({ event_name: 'feedback_submit', topic: 'trade', feedback_action: 'thumbs_down' }),
    ]
    const rollup = buildChimmyKPIRollup(events, PERIOD)
    const trade = rollup.by_topic.find((t) => t.topic === 'trade')
    const waiver = rollup.by_topic.find((t) => t.topic === 'waiver')
    expect(trade!.messages_sent).toBe(2)
    expect(trade!.helpful).toBe(1)
    expect(trade!.unhelpful).toBe(1)
    expect(waiver!.messages_sent).toBe(1)
  })

  it('does not create a topic bucket for null topic', () => {
    const events: ChimmyNormalisedEvent[] = [
      makeNorm({ event_name: 'message_send', topic: null }),
    ]
    const rollup = buildChimmyKPIRollup(events, PERIOD)
    expect(rollup.by_topic).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// buildChimmyKPIRollup — grouping by day
// ---------------------------------------------------------------------------

describe('buildChimmyKPIRollup — grouping by day', () => {
  it('groups events by calendar date and sorts ascending', () => {
    const events: ChimmyNormalisedEvent[] = [
      makeNorm({ event_name: 'message_send', date: '2026-04-03' }),
      makeNorm({ event_name: 'message_send', date: '2026-04-01' }),
      makeNorm({ event_name: 'message_send', date: '2026-04-01' }),
      makeNorm({ event_name: 'response_rendered', date: '2026-04-01' }),
    ]
    const rollup = buildChimmyKPIRollup(events, PERIOD)
    expect(rollup.by_day[0].date).toBe('2026-04-01')
    expect(rollup.by_day[0].messages_sent).toBe(2)
    expect(rollup.by_day[0].responses_rendered).toBe(1)
    expect(rollup.by_day[1].date).toBe('2026-04-03')
    expect(rollup.by_day[1].messages_sent).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// buildChimmyKPIRollupFromRaw — unknown event filtering
// ---------------------------------------------------------------------------

describe('buildChimmyKPIRollupFromRaw — unknown event filter', () => {
  it('ignores events with unknown event names', () => {
    const rows: ChimmyRawEventRow[] = [
      makeRow({ event: 'message_send', meta: { surface: 'chimmy_chat', mode: 'fast_take', action: 'sent' } }),
      makeRow({ event: 'some_other_tool_event', meta: { surface: 'chimmy_chat', mode: 'fast_take', action: 'x' } }),
      makeRow({ event: 'unknown_event', meta: null }),
    ]
    const rollup = buildChimmyKPIRollupFromRaw(rows, PERIOD)
    // Only message_send should be counted
    expect(rollup.totals.messages_sent).toBe(1)
    expect(rollup.event_count).toBe(1)
  })

  it('does not return raw text from meta in rollup output', () => {
    const rows: ChimmyRawEventRow[] = [
      makeRow({
        event: 'message_send',
        meta: {
          surface: 'chimmy_chat',
          mode: 'fast_take',
          action: 'message_sent',
          metadata: {
            prompt: 'Who should I start this week?',
            rawResponse: 'Start player X',
          },
        },
      }),
    ]
    const rollup = buildChimmyKPIRollupFromRaw(rows, PERIOD)
    const serialized = JSON.stringify(rollup)
    expect(serialized).not.toContain('Who should I start')
    expect(serialized).not.toContain('Start player X')
  })
})
