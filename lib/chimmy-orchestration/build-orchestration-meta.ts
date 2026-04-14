import type { ChimmyIntentClassification } from './intent-classifier'
import {
  buildFollowUps,
  intentToToolId,
  resolveToolLaunches,
  type ToolRoutingContext,
} from './tool-routing-map'
import type { ChimmyOrchestrationMeta } from './types'

export function buildMemorySummaryLine(prefs: Record<string, unknown> | null): string | null {
  if (!prefs || typeof prefs !== 'object') return null
  const parts: string[] = []
  const risk = prefs.riskStyle
  const arch = prefs.teamArchetype
  const sc = prefs.scoringPreference
  const lt = prefs.favoriteLeagueType
  if (typeof risk === 'string') parts.push(`risk style: ${risk}`)
  if (typeof arch === 'string') parts.push(`team build: ${arch}`)
  if (typeof sc === 'string') parts.push(`scoring preference: ${sc}`)
  if (typeof lt === 'string') parts.push(`league type: ${lt}`)
  if (parts.length === 0) return null
  return `Remembered preferences — ${parts.join('; ')}.`
}

export function buildOrchestrationPromptSection(args: {
  classification: ChimmyIntentClassification
  ctx: ToolRoutingContext
  memorySummary: string | null
}): string {
  const { classification, ctx, memorySummary } = args
  const { primary, secondary } = resolveToolLaunches(classification.intent, ctx)
  const toolLine = primary
    ? `Recommended tool: ${primary.label} → ${primary.href}`
    : 'No specific tool link; stay in chat.'
  const alt =
    secondary.length > 0
      ? `Secondary: ${secondary.map((s) => `${s.label} (${s.href})`).join('; ')}`
      : ''

  const routingPct = (classification.confidence * 100).toFixed(0)

  return `
## CHIMMY ORCHESTRATION (follow these rules)
- Detected intent: ${classification.intent} (${classification.label}), routing confidence ~${routingPct}%.
- ${toolLine}
${alt ? `- ${alt}` : ''}
- You are the premium AllFantasy assistant: concise, confident, never generic — never boilerplate or vague.

### REQUIRED PUBLIC RESPONSE SHAPE (use these exact Markdown headings in your reply)
1. **Direct** — One tight paragraph: the clearest action or call (who to start, what to do, or what to open).
2. **Why** — 2–4 bullets: reasoning tied to data, league/roster context when loaded, and uncertainty where thin.
3. **Tool** — One line naming the best AllFantasy tool for deeper work + markdown link when applicable, e.g. [Trade Analyzer](/trade-evaluator) or [Start A vs B](/tools/player-decision). Explain what they get there in one clause.
4. **Confidence** — One line: your judgment confidence AND note routing match ~${routingPct}% for this intent.
5. **Follow-up** — One suggested next question the user can paste back.

- When deeper analysis is better than chat, the **Tool** section must recommend the link above.
- ${memorySummary ? `User memory: ${memorySummary}` : 'No explicit preference memory yet — infer cautiously from context.'}
`.trim()
}

export function buildOrchestrationMeta(args: {
  classification: ChimmyIntentClassification
  ctx: ToolRoutingContext
  memorySummary: string | null
}): ChimmyOrchestrationMeta {
  const { classification, ctx, memorySummary } = args
  const { primary, secondary } = resolveToolLaunches(classification.intent, ctx)
  const recommendedToolId = intentToToolId(classification.intent)
  const followUps = buildFollowUps(classification.intent, ctx)

  return {
    intent: classification.intent,
    intentLabel: classification.label,
    recommendedToolId,
    confidence: classification.confidence,
    primaryLaunch: primary,
    secondaryLaunches: secondary,
    followUps,
    memorySummary,
    answerShape: {
      directAnswer: 'Lead with the clearest actionable recommendation for this intent.',
      why: 'Explain using roster/league context when loaded; cite uncertainty when data is thin.',
      recommendedTool: primary ? `Open ${primary.label} for deeper analysis: ${primary.href}` : 'Continue in Chimmy for clarification.',
      confidenceLine: `Routing confidence ~${(classification.confidence * 100).toFixed(0)}% for intent ${classification.intent}.`,
      followUp: followUps[0]?.prompt ?? 'What would you like to double-check next?',
    },
  }
}
