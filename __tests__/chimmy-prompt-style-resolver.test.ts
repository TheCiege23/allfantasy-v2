import { describe, expect, it } from 'vitest'
import {
  CHIMMY_PROMPT_STYLE_CONFIG,
  buildChimmyPromptStyleBlock,
  getChimmyPromptStyleBlock,
} from '@/lib/chimmy-interface/ChimmyPromptStyleResolver'

describe('ChimmyPromptStyleResolver', () => {
  it('exposes calm and natural default Chimmy prompt style', () => {
    const block = getChimmyPromptStyleBlock()

    expect(block).toContain('VOICE & TONE (strict)')
    expect(block).toContain('Clear, calm, natural, and steady')
    expect(block.toLowerCase()).toContain('not robotic')
    expect(block.toLowerCase()).toContain('overly hype')
  })

  it('builds style block from custom config', () => {
    const block = buildChimmyPromptStyleBlock({
      voiceTraits: ['Calm and concise'],
      avoidTraits: ['Shouting'],
      responseRules: ['Lead with recommendation'],
    })

    expect(block).toContain('Calm and concise')
    expect(block).toContain('Shouting')
    expect(block).toContain('Lead with recommendation')
    expect(CHIMMY_PROMPT_STYLE_CONFIG.responseRules.length).toBeGreaterThan(0)
  })
})
