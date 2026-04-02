import { describe, it, expect } from 'vitest'

import {
  BEHAVIOR_RULES,
  buildBehaviorRulesPrompt,
  checkBehaviorRules,
  checkCustomRules,
} from '@/lib/ai/behavior-rules'

describe('checkBehaviorRules', () => {
  it('passes clean output', () => {
    const result = checkBehaviorRules(
      'Start Justin Jefferson this week. His matchup against Detroit is favorable.',
      { input: 'who should I start?', featureName: 'chimmy' }
    )
    expect(result.passed).toBe(true)
    expect(result.violations).toHaveLength(0)
  })

  it('flags delete function as hard violation', () => {
    const result = checkBehaviorRules(
      'delete function handleTrade() and replace the entire file from scratch',
      { featureName: 'chimmy' }
    )
    expect(result.hardFailed).toBe(true)
    expect(result.violations.some((violation) => violation.ruleId === 'no-break-existing')).toBe(true)
  })

  it('flags scope creep as soft violation', () => {
    const result = checkBehaviorRules(
      "I'll fix the trade. While we're here I'll also refactor the waiver system.",
      { featureName: 'chimmy' }
    )
    expect(result.softFailed).toBe(true)
    expect(result.violations.some((violation) => violation.ruleId === 'stay-on-task')).toBe(true)
  })

  it('flags empty catch block as soft violation', () => {
    const result = checkBehaviorRules(
      'catch (err) {} // silently ignore',
      { featureName: 'chimmy' }
    )
    expect(result.violations.some((violation) => violation.ruleId === 'senior-engineer')).toBe(true)
  })

  it('buildBehaviorRulesPrompt returns non-empty string', () => {
    expect(BEHAVIOR_RULES.length).toBeGreaterThan(0)
    const prompt = buildBehaviorRulesPrompt()
    expect(prompt.length).toBeGreaterThan(100)
    expect(prompt).toContain('HARD')
    expect(prompt).toContain('SOFT')
  })

  it('custom rules work for blocked pattern', () => {
    const violations = checkCustomRules('never use this word: forbidden_word_here', [
      {
        id: 'test-rule',
        description: 'No forbidden words',
        prompt: 'Avoid forbidden_word',
        severity: 'soft',
        category: 'style',
        blockedPattern: 'forbidden_word',
        requiredPattern: null,
      },
    ])
    expect(violations).toHaveLength(1)
    expect(violations[0].ruleId).toBe('test-rule')
  })
})
