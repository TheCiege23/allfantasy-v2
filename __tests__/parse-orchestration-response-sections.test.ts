import { describe, expect, it } from 'vitest'

import { parseOrchestrationResponseSections } from '@/lib/chimmy-orchestration/parse-orchestration-response-sections'

describe('parseOrchestrationResponseSections', () => {
  it('returns null when there is no Direct section', () => {
    expect(parseOrchestrationResponseSections('Just a plain answer without headers.')).toBeNull()
  })

  it('parses block-style **Section** headers and body text', () => {
    const text = [
      '**Direct**',
      'Start Drake London.',
      '',
      '**Why**',
      'Higher target share and a softer matchup.',
      '',
      '**Tool**',
      '[Start A vs B](/tools/player-decision?leagueId=x)',
      '',
      '**Confidence**',
      'High — both are healthy.',
      '',
      '**Follow-up**',
      'Who is the safer floor if it rains?',
    ].join('\n')

    expect(parseOrchestrationResponseSections(text)).toEqual({
      direct: 'Start Drake London.',
      why: 'Higher target share and a softer matchup.',
      tool: '[Start A vs B](/tools/player-decision?leagueId=x)',
      confidence: 'High — both are healthy.',
      followUp: 'Who is the safer floor if it rains?',
    })
  })

  it('supports ## headings', () => {
    const text = ['## Direct', 'Accept the trade.', '## Why', 'You gain WR depth.'].join('\n')
    expect(parseOrchestrationResponseSections(text)).toEqual({
      direct: 'Accept the trade.',
      why: 'You gain WR depth.',
    })
  })

  it('supports inline **Direct** content on the same line', () => {
    const text = '**Direct** Bench the QB in monsoon conditions.\n\n**Why** Weather downgrades passing.'
    expect(parseOrchestrationResponseSections(text)).toEqual({
      direct: 'Bench the QB in monsoon conditions.',
      why: 'Weather downgrades passing.',
    })
  })
})
