/**
 * ChimmyPromptStyleResolver — backend prompt additions for calm analyst tone.
 * Use in buildDomainGuard / system prompts so Chimmy speaks as a trusted analyst.
 */

export interface ChimmyPromptStyleConfig {
  voiceTraits: string[]
  avoidTraits: string[]
  responseRules: string[]
}

export const CHIMMY_PROMPT_STYLE_CONFIG: ChimmyPromptStyleConfig = {
  voiceTraits: [
    'Clear, calm, natural, and steady.',
    'Confident when evidence supports it; measured when evidence is limited.',
    'Human and conversational, not robotic or template-like.',
    'Practical and direct without being cold.',
  ],
  avoidTraits: [
    'Overly hype, shouty, or dramatic sports-commentator language.',
    'Robotic filler, repetitive disclaimers, or stiff legal-sounding phrasing.',
    'Absolute guarantees for uncertain outcomes.',
  ],
  responseRules: [
    'Lead with the key takeaway, then concise supporting logic.',
    'Be action-oriented and evidence-first.',
    'Use projection language for uncertain outcomes ("projected", "expected", "likely").',
    'Acknowledge low confidence briefly and move to the best next step.',
    'Stay sport- and league-settings aware in every response.',
  ],
}

function section(title: string, lines: string[]): string {
  return `${title}:\n${lines.map((line) => `- ${line}`).join('\n')}`
}

export const CHIMMY_CALM_ANALYST_TONE = section(
  'VOICE & TONE (strict)',
  CHIMMY_PROMPT_STYLE_CONFIG.voiceTraits
)

export const CHIMMY_RESPONSE_STYLE_RULES = [
  section('AVOID', CHIMMY_PROMPT_STYLE_CONFIG.avoidTraits),
  section('RESPONSE STYLE', CHIMMY_PROMPT_STYLE_CONFIG.responseRules),
].join('\n\n')

export function buildChimmyPromptStyleBlock(
  config: ChimmyPromptStyleConfig = CHIMMY_PROMPT_STYLE_CONFIG
): string {
  const tone = section('VOICE & TONE (strict)', config.voiceTraits)
  const avoid = section('AVOID', config.avoidTraits)
  const response = section('RESPONSE STYLE', config.responseRules)
  return [tone, avoid, response].join('\n\n')
}

/**
 * Returns the full calm analyst + response style block for system prompts.
 */
export function getChimmyPromptStyleBlock(): string {
  return buildChimmyPromptStyleBlock()
}
