/**
 * Deterministic rules — AI cannot override or invent. Enforced in prompts and quality gate.
 * Supported sports: NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
 */

/** Rules injected into system prompts so AI never overrides deterministic layer. */
export const DETERMINISTIC_RULES = [
  'AI cannot invent player values.',
  'AI cannot override deterministic scores.',
  'AI cannot ignore scoring settings.',
  'AI cannot ignore league format.',
  'AI cannot invent assets or players.',
  'AI must always use the provided deterministic context where available.',
] as const

export function getDeterministicRulesPromptBlock(): string {
  return 'RULES (do not violate):\n' + DETERMINISTIC_RULES.map((r) => `- ${r}`).join('\n')
}
