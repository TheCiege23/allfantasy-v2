import { withApiUsage } from "@/lib/telemetry/usage"
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { checkAiRateLimit } from '@/lib/ai-protection'
import { logAiFailure } from '@/lib/error-tracking'
import { openaiChatTextStream } from '@/lib/openai-client'
import { getUniversalAIContext } from '@/lib/ai-player-context'
import { getPlayerAnalyticsBatch, computeAthleticGrade, computeCollegeProductionGrade, type PlayerAnalytics } from '@/lib/player-analytics'
import { logUserEventByUsername } from '@/lib/user-events'
import { logAiOutput } from '@/lib/ai/output-logger'
import { buildSportContextString, resolveSportForAI } from '@/lib/ai/AISportContextResolver'
import { resolveSportVariantContext } from '@/lib/league-defaults-orchestrator/SportVariantContextResolver'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league-access'
import { isAIAssistantEnabled } from '@/lib/feature-toggle'
import { runCostControlledOpenAIText } from '@/lib/ai-cost-control'

const ContextScopeSchema = z.object({
  sleeper_username: z.string(),
  include_legacy: z.boolean().optional().default(true),
})

const ChatRequestSchema = z.object({
  context_scope: ContextScopeSchema,
  message: z.string().min(1).max(2000),
  conversation_history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
})

function extractPlayerNamesFromMessage(message: string, history: Array<{role: string, content: string}>): string[] {
  const text = [message, ...history.slice(-3).map(h => h.content)].join(' ')
  const matches = text.match(/[A-Z][a-z]+(?:\.\s?)?(?:[A-Z][a-z]+)+/g) || []
  const unique = [...new Set(matches)].slice(0, 10)
  return unique
}

function buildPlayerAnalyticsContext(analyticsMap: Map<string, PlayerAnalytics>): string {
  const entries: string[] = []
  for (const [, analytics] of analyticsMap) {
    const athletic = computeAthleticGrade(analytics)
    const college = computeCollegeProductionGrade(analytics)
    const parts: string[] = [`**${analytics.name}** (${analytics.position}, ${analytics.currentTeam || 'FA'})`]
    
    if (athletic.score > 0) parts.push(`Athletic: ${athletic.grade} (${athletic.label})`)
    if (college.score > 0) parts.push(`College: ${college.grade} (${college.label})`)
    if (analytics.college.breakoutAge) parts.push(`Breakout Age: ${analytics.college.breakoutAge}`)
    if (analytics.combine.fortyYardDash) parts.push(`40-yd: ${analytics.combine.fortyYardDash}s`)
    if (analytics.college.dominatorRating) parts.push(`Dominator: ${analytics.college.dominatorRating}%`)
    if (analytics.comparablePlayers.length > 0) parts.push(`Comps: ${analytics.comparablePlayers.slice(0, 3).join(', ')}`)
    if (analytics.fantasyPointsPerGame) parts.push(`FPts/G: ${analytics.fantasyPointsPerGame.toFixed(1)}`)
    if (analytics.weeklyVolatility) parts.push(`Volatility: ${analytics.weeklyVolatility.toFixed(2)}`)
    if (analytics.draft.draftPick) parts.push(`Draft Pick: #${analytics.draft.draftPick}`)
    
    entries.push(parts.join(' | '))
  }
  
  return `\n\n## PLAYER ANALYTICS DATA (from database)\nUse this data to provide specific, evidence-based advice about these players:\n${entries.join('\n')}\n\nCite specific metrics when discussing these players (e.g., "His breakout age of 19.5 is elite" or "His A+ athletic profile suggests high ceiling").`
}

async function getLegacyContext(sleeperUsername: string) {
  const user = await prisma.legacyUser.findUnique({
    where: { sleeperUsername: sleeperUsername.toLowerCase() },
    include: {
      leagues: { include: { rosters: true } },
      aiReports: {
        where: { reportType: 'legacy' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!user) return null

  const allRosters = user.leagues.flatMap((l) => l.rosters)
  const totalWins = allRosters.reduce((sum, r: any) => sum + (r.wins ?? 0), 0)
  const totalLosses = allRosters.reduce((sum, r: any) => sum + (r.losses ?? 0), 0)
  const championships = allRosters.filter((r: any) => r.isChampion).length

  const aiReport = user.aiReports[0]
  const insights = (aiReport?.insights as Record<string, unknown> | null) ?? null

  const recentLeagues = user.leagues
    .slice()
    .sort((a, b) => b.season - a.season)
    .slice(0, 5)
    .map((l) => {
      const roster = l.rosters[0] as any
      return {
        name: l.name,
        season: l.season,
        record: roster ? `${roster.wins}-${roster.losses}` : 'N/A',
        champion: roster?.isChampion || false,
      }
    })

  return {
    display_name: user.displayName || user.sleeperUsername,
    total_leagues: user.leagues.length,
    total_seasons: Array.from(new Set(user.leagues.map((l) => l.season))).length,
    career_record: `${totalWins}-${totalLosses}`,
    win_percentage:
      totalWins + totalLosses > 0 ? Math.round((totalWins / (totalWins + totalLosses)) * 100) : 0,
    championships,
    archetype: (insights?.archetype as string) || 'Unknown',
    rating: aiReport?.rating || null,
    title: aiReport?.title || null,
    strengths: (insights?.strengths as string[]) || [],
    weaknesses: (insights?.weaknesses as string[]) || [],
    recent_leagues: recentLeagues,
  }
}

async function resolveChatLeagueMeta(
  body: Record<string, unknown>,
  legacyContext: Awaited<ReturnType<typeof getLegacyContext>>,
  resolvedSport: string
) {
  const bodyLeague = body.league as Record<string, unknown> | undefined

  const variantRaw =
    (typeof body.leagueVariant === 'string' ? body.leagueVariant : null) ??
    (typeof body.league_variant === 'string' ? body.league_variant : null) ??
    (typeof bodyLeague?.leagueVariant === 'string' ? bodyLeague.leagueVariant : null) ??
    (typeof bodyLeague?.league_variant === 'string' ? bodyLeague.league_variant : null)
  const variantContext = resolveSportVariantContext(
    String(bodyLeague?.sport ?? resolvedSport),
    variantRaw
  )

  const formatRaw =
    (typeof bodyLeague?.format === 'string' ? bodyLeague.format : null) ??
    (typeof body.format === 'string' ? body.format : null)
  const format =
    formatRaw ??
    (Boolean(bodyLeague?.isDynasty) || Boolean(body.isDynasty) ? 'dynasty' : null) ??
    (variantContext.isNflIdp ? variantContext.formatType : 'redraft')

  return {
    sport: variantContext.sport,
    leagueName:
      (typeof bodyLeague?.name === 'string' ? bodyLeague.name : null) ??
      legacyContext?.recent_leagues?.[0]?.name ??
      null,
    format,
    strategyMode:
      (typeof body.strategyMode === 'string' ? body.strategyMode : null) ??
      (typeof body.strategy_mode === 'string' ? body.strategy_mode : null) ??
      'balanced',
    superflex:
      Boolean((bodyLeague as Record<string, unknown> | undefined)?.superflex) ||
      Boolean(body.superflex),
    idp:
      variantContext.isNflIdp ||
      Boolean((bodyLeague as Record<string, unknown> | undefined)?.idp) ||
      Boolean(body.idp),
    tep:
      Boolean((bodyLeague as Record<string, unknown> | undefined)?.tep) ||
      Boolean(body.tep),
    numTeams:
      typeof bodyLeague?.numTeams === 'number'
        ? (bodyLeague.numTeams as number)
        : typeof body.numTeams === 'number'
          ? (body.numTeams as number)
          : undefined,
  }
}

function buildSystemPrompt(
  legacyContext: Awaited<ReturnType<typeof getLegacyContext>>,
  sportContext: string,
  playerAnalyticsContext?: string
) {
  let basePrompt = `You are THE ELITE AllFantasy AI Assistant - the #1 dynasty fantasy sports advisor.

${getUniversalAIContext()}

## SPORT CONTEXT
${sportContext}

## YOUR EXPERT KNOWLEDGE
You have encyclopedic knowledge of dynasty fantasy strategy:
- Trading: Buy-low/sell-high tactics, team status exploitation, value assessment
- Waivers: Value creation over points, tier system, contender vs rebuilder adds
- Drafting: Position scarcity, age curves, breakout indicators
- Roster construction: Starter strength, elite advantages, depth management

## TEAM CLASSIFICATION DECISION TREE
You can classify any team using this logic:
1. Does team have 6+ confident starters? If no → REBUILD
2. Has elite difference-maker (top QB/WR/TE)? If yes → CONTENDER
3. Has 2+ future 1sts or young unproductive assets? If yes → REBUILD, else → MIDDLE

## STRATEGY BY TEAM STATUS
- CONTENDERS: Buy points, sell uncertainty. Trade picks for proven starters. Win now.
- REBUILDERS: Sell points, buy value. Trade RBs for picks. Acquire young WRs/QBs.
- MIDDLE: Must choose a lane! Being stuck in the middle is the worst place.

## YOUR ROLE
- Answer questions with SPECIFIC, ACTIONABLE advice
- Use the user's career history to personalize recommendations
- Be honest about weaknesses - users respect directness
- Never make up statistics - only reference what's provided
- ALWAYS apply the tier system when discussing player values
- NEVER suggest unrealistic trades that violate tier rules
- Do NOT call any external APIs - all data comes from the database snapshot provided`

  if (legacyContext) {
    const winPct = legacyContext.win_percentage
    const statusGuess = winPct >= 55 && legacyContext.championships > 0 ? 'CONTENDER' :
                        winPct < 45 ? 'REBUILDER' : 'MIDDLE or TRANSITIONAL'
    
    basePrompt += `

## USER LEGACY CONTEXT (from database)
- Name: ${legacyContext.display_name}
- Career Record: ${legacyContext.career_record} (${winPct}% win rate)
- Championships: ${legacyContext.championships}
- Total Leagues: ${legacyContext.total_leagues} across ${legacyContext.total_seasons} seasons
- Archetype: ${legacyContext.archetype}
- Legacy Rating: ${legacyContext.rating || 'Not yet rated'}/100
- Title: ${legacyContext.title || 'Not assigned'}
- Estimated Status: ${statusGuess}

Strengths: ${legacyContext.strengths.join(', ') || 'Not identified'}
Areas to improve: ${legacyContext.weaknesses.join(', ') || 'Not identified'}

Recent League History:
${legacyContext.recent_leagues
  .map((l) => `- ${l.name} (${l.season}): ${l.record}${l.champion ? ' - CHAMPION' : ''}`)
  .join('\n')}

Use this context to personalize your responses. Tailor advice to their estimated team status.
Reference their history and patterns when giving recommendations.`
  }

  if (playerAnalyticsContext) {
    basePrompt += playerAnalyticsContext
  }

  return basePrompt
}

export const POST = withApiUsage({ endpoint: "/api/ai/chat", tool: "AiChat" })(async (request: NextRequest) => {
  try {
    if (!(await isAIAssistantEnabled())) {
      return NextResponse.json(
        { error: 'AI assistant is temporarily disabled by platform configuration.' },
        { status: 503 }
      )
    }

    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parseResult = ChatRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request format', details: parseResult.error.errors },
        { status: 400 }
      )
    }

    const { context_scope, message, conversation_history } = parseResult.data
    const sleeperUsername = context_scope.sleeper_username?.trim()?.toLowerCase()
    const resolvedSport = resolveSportForAI(body as Record<string, unknown>)
    const leagueId =
      (typeof (body as Record<string, unknown>).league_id === 'string'
        ? ((body as Record<string, unknown>).league_id as string)
        : null) ??
      (typeof (body as Record<string, unknown>).league === 'object' &&
      (body as Record<string, unknown>).league !== null &&
      typeof ((body as Record<string, unknown>).league as Record<string, unknown>).id === 'string'
        ? (((body as Record<string, unknown>).league as Record<string, unknown>).id as string)
        : null)

    if (!sleeperUsername) {
      return NextResponse.json({ error: 'Missing sleeper_username' }, { status: 400 })
    }

    if (leagueId) {
      try {
        await assertLeagueMember(leagueId, session.user.id)
      } catch {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const rl = checkAiRateLimit(request, 'chat', { sleeperUsername, includeIpInKey: true })

    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          retryAfterSec: rl.retryAfterSec,
          remaining: rl.remaining,
          useDeterministicFallback: true,
        },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    let legacyContext: any = null
    if (context_scope.include_legacy) {
      legacyContext = await getLegacyContext(sleeperUsername)
    }

    if (!legacyContext) {
      return NextResponse.json({ error: 'User not found. Please import your Sleeper data first.' }, { status: 404 })
    }

    const mentionedPlayers = extractPlayerNamesFromMessage(message, conversation_history)
    let playerAnalyticsContext = ''
    if (mentionedPlayers.length > 0) {
      try {
        const analyticsMap = await getPlayerAnalyticsBatch(mentionedPlayers)
        if (analyticsMap.size > 0) {
          playerAnalyticsContext = buildPlayerAnalyticsContext(analyticsMap)
        }
      } catch {
      }
    }

    const chatLeagueMeta = await resolveChatLeagueMeta(
      body as Record<string, unknown>,
      legacyContext,
      resolvedSport
    )
    const sportContext = buildSportContextString(chatLeagueMeta)

    const systemPrompt = buildSystemPrompt(legacyContext, sportContext, playerAnalyticsContext)

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...conversation_history.slice(-10),
      { role: 'user', content: message },
    ]

    const streamRequested =
      request.nextUrl.searchParams.get('stream') === '1' ||
      (typeof (body as Record<string, unknown>).stream === 'boolean' &&
        (body as Record<string, unknown>).stream === true)

    if (streamRequested) {
      const streamResult = await openaiChatTextStream({
        messages,
        temperature: 0.7,
        maxTokens: 1000,
      })
      if (!streamResult.ok) {
        return NextResponse.json(
          { error: 'Failed to process chat', details: streamResult.details },
          { status: 500 }
        )
      }

      const encoder = new TextEncoder()
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const writeEvent = (event: string, payload: Record<string, unknown>) => {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`)
            )
          }

          let responseText = ''
          try {
            writeEvent('start', { provider: 'openai', model: streamResult.model })
            for await (const chunk of streamResult.stream) {
              responseText += chunk
              writeEvent('chunk', { delta: chunk })
            }

            if (!responseText.trim()) {
              writeEvent('error', { error: 'No response from AI' })
              controller.close()
              return
            }

            logUserEventByUsername(sleeperUsername, 'ai_chat_used', {
              hasLegacyContext: !!legacyContext,
            })
            await logAiOutput({
              provider: 'openai',
              role: 'narrative',
              taskType: 'ai_chat',
              targetType: 'user',
              targetId: sleeperUsername,
              model: streamResult.model,
              contentText: responseText,
              meta: {
                hasLegacyContext: !!legacyContext,
              },
            })

            writeEvent('done', {
              success: true,
              response: responseText,
              legacy_context: {
                included: true,
                display_name: legacyContext.display_name,
                archetype: legacyContext.archetype,
              },
              rate_limit: { remaining: rl.remaining, retryAfterSec: rl.retryAfterSec },
            })
            controller.close()
          } catch (streamError) {
            writeEvent('error', {
              error: streamError instanceof Error ? streamError.message : 'Streaming failed',
            })
            controller.close()
          }
        },
      })

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      })
    }

    const completion = await runCostControlledOpenAIText({
      feature: 'ai_chat',
      enableAI: true,
      fallbackText: null,
      messages,
      temperature: 0.7,
      maxTokens: 1000,
      cacheTtlMs: 30_000,
      repeatCooldownMs: 6_000,
      cacheContext: {
        sleeperUsername,
        resolvedSport,
        leagueId: leagueId ?? null,
      },
    })
    const responseText = completion.text

    if (!completion.ok || !responseText?.trim()) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

    logUserEventByUsername(sleeperUsername, 'ai_chat_used', {
      hasLegacyContext: !!legacyContext,
    })

    await logAiOutput({
      provider: 'openai',
      role: 'narrative',
      taskType: 'ai_chat',
      targetType: 'user',
      targetId: sleeperUsername,
      model: completion.model,
      contentText: responseText,
      meta: {
        hasLegacyContext: !!legacyContext,
      },
    })

    return NextResponse.json({
      success: true,
      response: responseText,
      legacy_context: {
        included: true,
        display_name: legacyContext.display_name,
        archetype: legacyContext.archetype,
      },
      rate_limit: { remaining: rl.remaining, retryAfterSec: rl.retryAfterSec },
    })
  } catch (error) {
    logAiFailure(error, { tool: 'AiChat', endpoint: '/api/ai/chat', provider: 'openai' })
    return NextResponse.json({ error: 'Failed to process chat', details: String(error) }, { status: 500 })
  }
})
