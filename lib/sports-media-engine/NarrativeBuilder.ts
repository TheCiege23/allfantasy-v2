/**
 * NarrativeBuilder — turns structured context into human-readable articles.
 * AI roles: DeepSeek → statistical insights; Grok → narrative tone; OpenAI → final article.
 * When only OpenAI is configured, a single prompt combines stats + narrative + article.
 */

import { deepseekChat } from '@/lib/deepseek-client'
import { openaiChatText } from '@/lib/openai-client'
import { parseTextFromXaiChatCompletion, xaiChatJson } from '@/lib/xai-client'
import { buildSportContextString } from '@/lib/ai/AISportContextResolver'
import type { GenerationContext, GeneratedArticle, ArticleGenerationType } from './types'

const ARTICLE_TYPES: Record<
  ArticleGenerationType,
  { title: string; system: string; userPrefix: string }
> = {
  weekly_recap: {
    title: 'Weekly Recap',
    system: 'You are a sports media writer. Write a short, engaging weekly league recap. Use the provided stats and highlights. Output exactly two lines: first line is the headline (no quotes), second line is the article body (2-4 short paragraphs). Separate headline and body with a single newline.',
    userPrefix: 'Write a weekly recap for this fantasy league.',
  },
  power_rankings: {
    title: 'Power Rankings',
    system: 'You are a sports analyst. Write a power rankings article. First line: headline. Second part: body with 2-4 paragraphs discussing the top teams and movement. Separate headline and body with a single newline.',
    userPrefix: 'Write a power rankings article for this league.',
  },
  trade_breakdown: {
    title: 'Trade Breakdown',
    system: 'You are a trade analyst. Write a short trade breakdown article. First line: headline. Then body (2-3 paragraphs). Separate with a single newline.',
    userPrefix: 'Write a trade breakdown article.',
  },
  upset_alert: {
    title: 'Upset Alert',
    system: 'You are a sports writer. Write an upset alert or underdog story. First line: headline. Then body. Separate with a single newline.',
    userPrefix: 'Write an upset alert / underdog story for this league.',
  },
  playoff_preview: {
    title: 'Playoff Preview',
    system: 'You are a sports analyst. Write a playoff preview. First line: headline. Then body with matchups and key storylines. Separate with a single newline.',
    userPrefix: 'Write a playoff preview for this league.',
  },
  championship_recap: {
    title: 'Championship Recap',
    system: 'You are a sports writer. Write a championship recap story. First line: headline. Then body celebrating the winner and summarizing the season. Separate with a single newline.',
    userPrefix: 'Write a championship recap for this league.',
  },
}

function formatContextForPrompt(ctx: GenerationContext): string {
  const parts: string[] = []
  if (ctx.leagueName) parts.push(`League: ${ctx.leagueName}`)
  parts.push(`Sport: ${ctx.sport}`)
  if (ctx.season) parts.push(`Season: ${ctx.season}`)
  if (ctx.week != null) parts.push(`Week: ${ctx.week}`)
  parts.push('\nStandings / teams:')
  ctx.teams.forEach((t, i) => {
    parts.push(
      `  ${i + 1}. ${t.teamName} (${t.ownerName}) — W-L: ${t.wins}-${t.losses}, PF: ${t.pointsFor.toFixed(1)}, PA: ${t.pointsAgainst.toFixed(1)}`
    )
  })
  if (ctx.highlights?.length) {
    parts.push('\nHighlights:')
    ctx.highlights.forEach((h) => parts.push(`  - ${h}`))
  }
  if (ctx.tradeSummary) parts.push('\nTrade summary: ' + ctx.tradeSummary)
  return parts.join('\n')
}

function buildFallbackArticle(
  title: string,
  leagueName: string | undefined,
  type: ArticleGenerationType,
  reason?: string
): GeneratedArticle {
  const detail = reason?.trim() ? ` (${reason.trim()})` : ''
  return {
    headline: `${title} — ${leagueName ?? 'League'}`,
    body: `Article generation is temporarily unavailable.${detail}`,
    tags: [type],
  }
}

/**
 * Optionally get statistical insights from DeepSeek (stats-focused model).
 * Returns a short bullet list or empty string if unavailable.
 */
export async function getStatisticalInsights(ctx: GenerationContext): Promise<string> {
  try {
    const prompt = `Summarize these fantasy league stats in 3-5 short bullet points (key numbers, trends, standout teams).\n\n${formatContextForPrompt(ctx)}`
    const result = await deepseekChat({
      prompt,
      systemPrompt: 'You are a quantitative fantasy sports analyst. Be concise; output only the bullet points.',
      temperature: 0.2,
      maxTokens: 400,
    })
    if (result.error || !result.content?.trim()) return ''
    return result.content.trim()
  } catch {
    return ''
  }
}

/**
 * Optional Grok pass for narrative tone hints. Non-fatal when unavailable.
 */
export async function getNarrativeToneHints(
  type: ArticleGenerationType,
  ctx: GenerationContext
): Promise<string> {
  try {
    const result = await xaiChatJson({
      messages: [
        {
          role: 'system',
          content:
            'You are a sports narrative editor. Return 3 concise bullet points describing tone and storytelling style. No stats, no preamble.',
        },
        {
          role: 'user',
          content: `Article type: ${type}\n\nLeague context:\n${formatContextForPrompt(ctx)}`,
        },
      ],
      temperature: 0.35,
      maxTokens: 180,
    })
    if (!result.ok) return ''
    const text = parseTextFromXaiChatCompletion(result.json)
    return text?.trim() ?? ''
  } catch {
    return ''
  }
}

/**
 * Generate headline + body using OpenAI (human-readable article).
 * Optionally inject stats from DeepSeek and narrative tone hints from Grok.
 */
export async function buildArticle(
  type: ArticleGenerationType,
  ctx: GenerationContext,
  options?: { statisticalInsights?: string; leagueMeta?: Record<string, unknown> }
): Promise<GeneratedArticle> {
  const config = ARTICLE_TYPES[type]
  const contextBlob = formatContextForPrompt(ctx)
  const sportContext = options?.leagueMeta
    ? buildSportContextString(options.leagueMeta)
    : `Sport: ${ctx.sport}. League: ${ctx.leagueName ?? ctx.leagueId}.`

  let userContent = `${config.userPrefix}\n\nContext:\n${contextBlob}`
  if (options?.statisticalInsights) {
    userContent += `\n\nStatistical insights (use these in the article):\n${options.statisticalInsights}`
  }
  const toneHints = await getNarrativeToneHints(type, ctx)
  if (toneHints) {
    userContent += `\n\nNarrative tone guidance (from Grok):\n${toneHints}`
  }

  const systemContent = `${config.system} ${sportContext} Write in a clear, engaging tone suitable for league members.`

  let response:
    | { ok: true; text: string; model: string; baseUrl: string }
    | { ok: false; status: number; details: string; model: string; baseUrl: string }
  try {
    response = await openaiChatText({
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
      maxTokens: 1200,
    })
  } catch (e) {
    return buildFallbackArticle(
      config.title,
      ctx.leagueName,
      type,
      e instanceof Error ? e.message : String(e)
    )
  }

  if (!response.ok) {
    return buildFallbackArticle(config.title, ctx.leagueName, type, response.details)
  }

  const text = response.text.trim()
  const firstNewline = text.indexOf('\n')
  const headline = firstNewline > 0 ? text.slice(0, firstNewline).trim() : text.slice(0, 80)
  const body = firstNewline > 0 ? text.slice(firstNewline).trim() : text

  return {
    headline: headline || `${config.title} — ${ctx.leagueName ?? 'League'}`,
    body: body || text,
    tags: [type],
  }
}
