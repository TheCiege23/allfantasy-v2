import { describe, expect, it } from 'vitest'

import { buildChimmyVoiceSummary, countWords } from '@/lib/chimmy-chat/presentation'

describe('buildChimmyVoiceSummary', () => {
  it('extracts the recommendation line for trade answers', () => {
    const summary = buildChimmyVoiceSummary({
      recommendedTool: 'trade_analyzer',
      content: [
        'Recommendation: REJECT this trade.',
        'CeeDee Lamb is younger and carries the better dynasty insulation.',
        'You can revisit if a stronger add is included.',
      ].join('\n'),
      responseStructure: {
        shortAnswer: 'Probably pass.',
      },
    })

    expect(summary).toBe('REJECT this trade.')
  })

  it('extracts the pickup verdict for waiver answers', () => {
    const summary = buildChimmyVoiceSummary({
      recommendedTool: 'waiver_wire',
      content: [
        'Top pickup: Deebo Samuel for the short-term ceiling boost.',
        'Secondary add: Diontae Johnson if you need stable targets.',
      ].join('\n'),
      responseStructure: {
        shortAnswer: 'Prioritize Deebo Samuel.',
      },
    })

    expect(summary).toBe('Top pickup: Deebo Samuel for the short-term ceiling boost.')
  })

  it('limits general summaries to the first two sentences and under 30 words', () => {
    const summary = buildChimmyVoiceSummary({
      content: [
        'Your lineup is in solid shape this week.',
        'Monitor the Friday injury report before locking your flex.',
        'The rest of the roster is stable enough to avoid panic moves.',
      ].join(' '),
      responseStructure: {
        shortAnswer: '',
      },
    })

    expect(summary).toBe(
      'Your lineup is in solid shape this week. Monitor the Friday injury report before locking your flex.'
    )
    expect(countWords(summary)).toBeLessThanOrEqual(30)
  })
})
