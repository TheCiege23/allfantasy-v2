/**
 * NarrativeGenerator — produces commentary text from event context.
 * AI roles: DeepSeek → statistical context; Grok → tone; OpenAI → commentary text.
 */

import { deepseekChat } from '@/lib/deepseek-client'
import { openaiChatText } from '@/lib/openai-client'
import { parseTextFromXaiChatCompletion, xaiChatJson } from '@/lib/xai-client'
import { buildSportContextString } from '@/lib/ai/AISportContextResolver'
import type { CommentaryContext, GeneratedCommentary } from './types'

function contextToBlob(ctx: CommentaryContext): string {
  const lines: string[] = []
  lines.push(`League: ${ctx.leagueName ?? ctx.leagueId}`)
  lines.push(`Sport: ${ctx.sport}`)
  if (ctx.eventType === 'matchup_commentary') {
    lines.push(`Matchup: ${ctx.teamAName} vs ${ctx.teamBName}`)
    lines.push(`Score: ${ctx.scoreA} - ${ctx.scoreB}`)
    if (ctx.week != null) lines.push(`Week: ${ctx.week}`)
    if (ctx.season != null) lines.push(`Season: ${ctx.season}`)
    if (ctx.situation) lines.push(`Situation: ${ctx.situation}`)
  }
  if (ctx.eventType === 'trade_reaction') {
    lines.push(`Managers: ${ctx.managerA}, ${ctx.managerB}`)
    lines.push(`Summary: ${ctx.summary}`)
    if (ctx.tradeType) lines.push(`Type: ${ctx.tradeType}`)
  }
  if (ctx.eventType === 'waiver_reaction') {
    lines.push(`Manager: ${ctx.managerName}`)
    lines.push(`Player: ${ctx.playerName}`)
    lines.push(`Action: ${ctx.action}`)
    if (ctx.position) lines.push(`Position: ${ctx.position}`)
    if (ctx.faabSpent != null) lines.push(`FAAB: ${ctx.faabSpent}`)
  }
  if (ctx.eventType === 'playoff_drama') {
    lines.push(`Headline: ${ctx.headline}`)
    lines.push(`Summary: ${ctx.summary}`)
    if (ctx.dramaType) lines.push(`Type: ${ctx.dramaType}`)
  }
  return lines.join('\n')
}

/**
 * Get short statistical context from DeepSeek (e.g. key numbers, trend).
 */
export async function getStatisticalContext(ctx: CommentaryContext): Promise<string> {
  const blob = contextToBlob(ctx)
  const prompt = `In 2-4 short sentences, give statistical or strategic context for this fantasy event. Be concise.\n\n${blob}`

  try {
    const result = await deepseekChat({
      prompt,
      systemPrompt: 'You are a quantitative fantasy sports analyst. Be brief and factual.',
      temperature: 0.2,
      maxTokens: 200,
    })
    if (result.error || !result.content?.trim()) return ''
    return result.content.trim()
  } catch {
    return ''
  }
}

/**
 * Get short tone guidance from Grok (voice, pacing, dramatic framing).
 */
export async function getToneGuidance(ctx: CommentaryContext): Promise<string> {
  const blob = contextToBlob(ctx)
  try {
    const response = await xaiChatJson({
      messages: [
        {
          role: 'system',
          content:
            'You are a fantasy sports color commentator. Return 2-3 short bullet points describing tone and style only. No stats. No preamble.',
        },
        {
          role: 'user',
          content: `Event type: ${ctx.eventType}\n\nContext:\n${blob}`,
        },
      ],
      temperature: 0.5,
      maxTokens: 160,
    })
    if (!response.ok) return ''
    return parseTextFromXaiChatCompletion(response.json)?.trim() ?? ''
  } catch {
    return ''
  }
}

/**
 * Generate commentary headline + body using OpenAI (Grok-like tone in system prompt).
 */
export async function generateCommentaryText(
  ctx: CommentaryContext,
  statisticalContext?: string
): Promise<GeneratedCommentary> {
  const blob = contextToBlob(ctx)
  const sportContext = buildSportContextString({
    sport: ctx.sport,
    leagueName: ctx.leagueName ?? undefined,
  })

  const eventInstructions: Record<string, string> = {
    matchup_commentary:
      'Narrate this matchup in real-time style: short, punchy headline and 1-2 sentences of color (tension, momentum, or blowout).',
    trade_reaction:
      'React to this trade like a bold analyst: headline plus 1-2 sentences (who won, blockbuster or snooze).',
    waiver_reaction:
      'React to this waiver move: catchy headline and one sentence on impact or desperation.',
    playoff_drama:
      'Narrate this playoff moment with drama: headline and 1-2 sentences that capture the stakes.',
  }
  const instruction = eventInstructions[ctx.eventType] ?? 'Write a short headline and 1-2 sentence commentary.'

  let userContent = `${instruction}\n\nContext:\n${blob}`
  if (statisticalContext) {
    userContent += `\n\nStatistical context (weave in if relevant):\n${statisticalContext}`
  }
  const toneGuidance = await getToneGuidance(ctx)
  if (toneGuidance) {
    userContent += `\n\nTone guidance (from Grok):\n${toneGuidance}`
  }

  const systemContent = `You are a fantasy sports commentator with personality and wit (Grok-style tone). ${sportContext} Keep headline under 80 chars. Output format: first line = headline, then a blank line, then body (1-2 sentences). No markdown.`

  let response:
    | { ok: true; text: string; model: string; baseUrl: string }
    | { ok: false; status: number; details: string; model: string; baseUrl: string }
  try {
    response = await openaiChatText({
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ],
      temperature: 0.75,
      maxTokens: 350,
    })
  } catch {
    return {
      headline: buildFallbackHeadline(ctx),
      body: 'Commentary is temporarily unavailable.',
    }
  }

  if (!response.ok) {
    return {
      headline: buildFallbackHeadline(ctx),
      body: 'Commentary is temporarily unavailable.',
    }
  }

  const text = response.text.trim()
  const parts = text.split(/\n\n+/)
  const headline = parts[0]?.replace(/\n/g, ' ').trim().slice(0, 256) ?? 'Update'
  const body = parts.slice(1).join('\n\n').trim() || text

  return { headline, body }
}

function buildFallbackHeadline(ctx: CommentaryContext): string {
  if (ctx.eventType === 'matchup_commentary') {
    return `${ctx.teamAName} vs ${ctx.teamBName}: ${ctx.scoreA}-${ctx.scoreB}`
  }
  if (ctx.eventType === 'trade_reaction') {
    return `Trade: ${ctx.managerA} & ${ctx.managerB}`
  }
  if (ctx.eventType === 'waiver_reaction') {
    return `${ctx.managerName} ${ctx.action} ${ctx.playerName}`
  }
  if (ctx.eventType === 'playoff_drama') {
    return ctx.headline.trim() || 'Playoff drama update'
  }
  return 'League update'
}
