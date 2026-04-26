import type { ChimmySuggestedChip } from '@/lib/chimmy-interface/types'
import type { ChimmyAIAnalyticsIngressEvent } from '@/lib/chimmy-chat/analytics-events'

export type ChimmyIntentChipTopic = NonNullable<ChimmyAIAnalyticsIngressEvent['topic']>

export type ChimmyIntentChipDefinition = {
  id: string
  label: string
  topic: ChimmyIntentChipTopic
  buildPrompt: (context: { leagueName?: string | null }) => string
}

const INTENT_CHIP_DEFINITIONS: ChimmyIntentChipDefinition[] = [
  {
    id: 'chip-trade-help',
    label: 'Trade Help',
    topic: 'trade',
    buildPrompt: ({ leagueName }) =>
      leagueName
        ? `Help me evaluate a trade in ${leagueName}. Give fair value, risk, and a recommended next move.`
        : 'Help me evaluate a trade. Give fair value, risk, and a recommended next move.',
  },
  {
    id: 'chip-start-sit',
    label: 'Start/Sit',
    topic: 'start_sit',
    buildPrompt: ({ leagueName }) =>
      leagueName
        ? `Give me start/sit guidance for ${leagueName} with confidence tiers and key risks.`
        : 'Give me start/sit guidance with confidence tiers and key risks.',
  },
  {
    id: 'chip-waiver-help',
    label: 'Waiver Help',
    topic: 'waiver',
    buildPrompt: ({ leagueName }) =>
      leagueName
        ? `What are the best waiver adds in ${leagueName} this week, and how should I prioritize them?`
        : 'What are the best waiver adds this week, and how should I prioritize them?',
  },
  {
    id: 'chip-todays-injuries',
    label: "Today's Injuries",
    topic: 'injury',
    buildPrompt: ({ leagueName }) =>
      leagueName
        ? `Summarize today's injury impacts for ${leagueName} and how they affect lineup decisions.`
        : "Summarize today's injury impacts and how they affect lineup decisions.",
  },
  {
    id: 'chip-league-recap',
    label: 'League Recap',
    topic: 'general',
    buildPrompt: ({ leagueName }) =>
      leagueName
        ? `Give me a quick league recap for ${leagueName}: biggest trends, risers, and urgent moves.`
        : 'Give me a quick league recap: biggest trends, risers, and urgent moves.',
  },
  {
    id: 'chip-draft-help',
    label: 'Draft Help',
    topic: 'draft',
    buildPrompt: ({ leagueName }) =>
      leagueName
        ? `Give me a draft strategy plan for ${leagueName}: best value targets, fades, and next-pick priorities.`
        : 'Give me a draft strategy plan: best value targets, fades, and next-pick priorities.',
  },
  {
    id: 'chip-commissioner-help',
    label: 'Commissioner Help',
    topic: 'commissioner',
    buildPrompt: ({ leagueName }) =>
      leagueName
        ? `What commissioner actions should I take in ${leagueName} right now, and why?`
        : 'What commissioner actions should I take right now, and why?',
  },
]

export function getChimmyIntentChipDefinitions(): ChimmyIntentChipDefinition[] {
  return INTENT_CHIP_DEFINITIONS
}

export function getChimmyIntentChips(args: {
  leagueName?: string | null
}): ChimmySuggestedChip[] {
  return INTENT_CHIP_DEFINITIONS.map((chip) => ({
    id: chip.id,
    label: chip.label,
    category: chip.topic,
    prompt: chip.buildPrompt({ leagueName: args.leagueName }),
  }))
}
