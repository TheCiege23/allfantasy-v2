/**
 * AF Commissioner Subscription — AI-generated weekly challenges.
 *
 * Two modes:
 * 1. Template-based: Rotates through SurvivorChallengeTemplate records (fast, deterministic)
 * 2. AI-generated: Calls Claude API with game context to create unique challenges (requires AF sub)
 *
 * Falls back to template if AI call fails.
 */

import { prisma } from '@/lib/prisma'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'
import type { NextResponse } from 'next/server'

export type GeneratedChallenge = {
  type: string
  title: string
  description: string
  instructions: string
  reward: { type: string; amount?: number; description?: string }
  penalty: { type: string; description: string } | null
  correctAnswerLogic: string
  source: 'ai' | 'template'
}

/**
 * Generate a weekly challenge. Tries AI first (if AF subscription active),
 * falls back to template rotation.
 */
export async function generateWeeklyChallenge(
  leagueId: string,
  week: number,
  sport: string,
  phase: string,
  options?: { forceAi?: boolean; forceTemplate?: boolean },
): Promise<GeneratedChallenge | NextResponse> {
  const gate = await requireAfSub()
  if (typeof gate !== 'string') return gate

  const post = phase === 'merge' || phase === 'jury' || phase === 'finale'
  const validity = post ? 'post_merge' : 'pre_merge'

  // Try AI-generated challenge first (unless forceTemplate)
  if (!options?.forceTemplate) {
    try {
      const aiChallenge = await generateChallengeWithAI(leagueId, week, sport, phase, validity)
      if (aiChallenge) return aiChallenge
    } catch (err) {
      console.warn('[challengeCreator] AI generation failed, falling back to template:', err)
    }
  }

  // Fallback: template rotation
  return generateChallengeFromTemplate(leagueId, week, sport, phase, validity)
}

/**
 * AI-powered challenge generation using Claude API.
 */
async function generateChallengeWithAI(
  leagueId: string,
  week: number,
  sport: string,
  phase: string,
  validity: string,
): Promise<GeneratedChallenge | null> {
  let client: import('openai').default
  try {
    const mod = await import('@/lib/ai/openai-route-client')
    client = mod.getOpenAIRouteClient()
  } catch {
    return null
  }

  const sportScheduleHint = getSportScheduleHint(sport, week)

  const prompt = `You are the AI host for a Survivor-style fantasy ${sport} league. Generate a unique weekly mini-challenge for Week ${week} (${phase} phase).

Sport: ${sport}
Phase: ${phase} (${validity})
${sportScheduleHint}

Generate a challenge that is fun, competitive, and easy to score objectively.

Respond with ONLY valid JSON matching this schema:
{
  "type": "prediction|over_under|player_prop|tribe_vs|trivia|puzzle",
  "title": "Short exciting title",
  "description": "1-2 sentence description of the challenge",
  "instructions": "Exact instructions for submitting picks",
  "reward": { "type": "faab|immunity_bonus|token_award|scoring_bonus|idol_clue", "amount": 1, "description": "What the winner gets" },
  "penalty": { "type": "penalty", "description": "What the loser gets (or null)" },
  "correctAnswerLogic": "How the correct answer is determined after games"
}`

  const response = await client.chat.completions.create({
    model: 'claude-sonnet-4-20250514',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 500,
    temperature: 0.8,
  })

  const content = response.choices[0]?.message?.content
  if (!content) return null

  try {
    const parsed = JSON.parse(content.replace(/```json?\n?/g, '').replace(/```/g, '').trim())
    return {
      type: String(parsed.type ?? 'prediction'),
      title: String(parsed.title ?? `Week ${week} Challenge`),
      description: String(parsed.description ?? ''),
      instructions: String(parsed.instructions ?? 'Submit your pick before kickoff.'),
      reward: {
        type: String(parsed.reward?.type ?? 'faab'),
        amount: Number(parsed.reward?.amount ?? 1),
        description: String(parsed.reward?.description ?? ''),
      },
      penalty: parsed.penalty ? { type: 'penalty', description: String(parsed.penalty.description) } : null,
      correctAnswerLogic: String(parsed.correctAnswerLogic ?? 'Resolved from official results.'),
      source: 'ai' as const,
    }
  } catch {
    return null
  }
}

/**
 * Template-based challenge generation (deterministic fallback).
 */
async function generateChallengeFromTemplate(
  leagueId: string,
  week: number,
  sport: string,
  phase: string,
  validity: string,
): Promise<GeneratedChallenge> {
  const templates = await prisma.survivorChallengeTemplate.findMany({
    where: { aiCanAutoGenerate: true, phaseValidity: validity },
    take: 24,
  })
  const pick = templates[week % Math.max(1, templates.length)] ?? null

  return {
    type: pick?.challengeKey ?? 'prediction',
    title: pick?.name ?? `Week ${week} ${sport} pick`,
    description: pick?.theme ?? `Survivor mini-challenge for ${phase} phase.`,
    instructions: pick?.inputDescription ?? 'Reply with JSON { "pick": "..." } before lock.',
    reward: {
      type: pick?.defaultRewardType || 'faab',
      amount: 1,
      description: pick?.defaultRewardType ? String(pick.defaultRewardType) : '+1 FAAB',
    },
    penalty: pick?.defaultPenaltyType
      ? { type: 'penalty', description: String(pick.defaultPenaltyType) }
      : null,
    correctAnswerLogic: `Resolved from official box score. Catalog: ${pick?.challengeKey ?? 'generic'}; league=${leagueId}; week=${week}.`,
    source: 'template' as const,
  }
}

/**
 * Provide sport-specific schedule context for AI challenge generation.
 */
function getSportScheduleHint(sport: string, week: number): string {
  const hints: Record<string, string> = {
    NFL: `NFL Week ${week} games include Thursday Night Football, Sunday slate, Sunday Night Football, and Monday Night Football.`,
    NBA: `NBA Week ${week} features a full slate of games across the week.`,
    MLB: `MLB Week ${week} has daily games across the league.`,
    NHL: `NHL Week ${week} has games most nights of the week.`,
    NCAAF: `College Football Week ${week} features Saturday games with rivalry matchups.`,
    NCAAB: `College Basketball Week ${week} features conference matchups and tournament preparation.`,
    SOCCER: `Soccer Week ${week} features league matches across major competitions.`,
  }
  return hints[sport.toUpperCase()] ?? `${sport} Week ${week} games.`
}
