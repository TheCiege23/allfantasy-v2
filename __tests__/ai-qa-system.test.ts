import { describe, expect, it } from 'vitest'
import { runAIQASystem } from '@/lib/ai-qa-system'

describe('AIQASystem', () => {
  it('passes when answer is deterministic-grounded and consistent', () => {
    const qa = runAIQASystem({
      primaryAnswer: 'Fairness is 87/100 and sender has a +2.0 value edge. Accept if roster fit is immediate.',
      modelOutputs: [
        { model: 'openai', raw: 'Accept this trade with the +2.0 edge.', skipped: false },
        { model: 'deepseek', raw: 'Numbers support accepting at 87/100 fairness.', skipped: false },
      ],
      envelope: {
        deterministicPayload: {
          fairnessScore: 87,
          senderNetValue: 2.0,
          favoredSide: 'sender',
        },
      } as any,
      factGuardWarnings: [],
    })

    expect(qa.passed).toBe(true)
    expect(qa.verification.noHallucinations).toBe(true)
    expect(qa.verification.correctDataUsage).toBe(true)
    expect(qa.verification.consistentResponses).toBe(true)
    expect(qa.score).toBeGreaterThanOrEqual(85)
  })

  it('flags hallucination when answer introduces unsupported numbers', () => {
    const qa = runAIQASystem({
      primaryAnswer: 'Fairness is 94/100 with a +6.5 edge, so accept immediately.',
      modelOutputs: [{ model: 'openai', raw: 'Accept immediately.', skipped: false }],
      envelope: {
        deterministicPayload: {
          fairnessScore: 87,
          senderNetValue: 2.0,
        },
      } as any,
      factGuardWarnings: [],
    })

    expect(qa.verification.noHallucinations).toBe(false)
    expect(qa.warnings.join(' ')).toMatch(/introduced numbers/i)
    expect(qa.passed).toBe(false)
  })

  it('flags inconsistency when provider outputs disagree on direction', () => {
    const qa = runAIQASystem({
      primaryAnswer: 'Accept the trade.',
      modelOutputs: [
        { model: 'openai', raw: 'Accept this deal.', skipped: false },
        { model: 'grok', raw: 'Reject this trade.', skipped: false },
      ],
      envelope: {
        deterministicPayload: { fairnessScore: 82 },
      } as any,
      factGuardWarnings: [],
    })

    expect(qa.verification.consistentResponses).toBe(false)
    expect(qa.warnings.join(' ')).toMatch(/disagree/i)
    expect(qa.passed).toBe(false)
  })
})
