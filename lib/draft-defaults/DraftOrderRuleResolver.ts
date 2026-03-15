/**
 * Resolves draft order rules (snake vs linear) for pick order and UI labels.
 * Used by draft room and mock draft to compute pick slot and display rules.
 */
export type DraftOrderRule = 'snake' | 'linear'

export interface DraftOrderRuleDescription {
  rule: DraftOrderRule
  label: string
  description: string
}

const RULES: Record<DraftOrderRule, DraftOrderRuleDescription> = {
  snake: {
    rule: 'snake',
    label: 'Snake',
    description: 'Order reverses each round (1–12, then 12–1, then 1–12).',
  },
  linear: {
    rule: 'linear',
    label: 'Linear',
    description: 'Same order every round (1–12 each round).',
  },
}

/**
 * Get draft order rule and description for UI/timer logic.
 */
export function getDraftOrderRule(snakeOrLinear: string | undefined | null): DraftOrderRuleDescription {
  const key = (snakeOrLinear ?? 'snake').toString().toLowerCase()
  return RULES[key === 'linear' ? 'linear' : 'snake'] ?? RULES.snake
}

/**
 * Whether the draft uses snake order (reversing each round).
 */
export function isSnakeDraft(snakeOrLinear: string | undefined | null): boolean {
  return (snakeOrLinear ?? 'snake').toString().toLowerCase() !== 'linear'
}
