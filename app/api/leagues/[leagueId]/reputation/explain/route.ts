import { NextResponse } from 'next/server'
import { openaiChatText } from '@/lib/openai-client'
import {
  getReputationByLeagueAndManager,
  listEvidenceForManager,
} from '@/lib/reputation-engine/ManagerTrustQueryService'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leagues/[leagueId]/reputation/explain
 * Body: { managerId }. Returns a short narrative explaining the manager's reputation (for AI "Explain" button).
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const managerId = body.managerId
    if (!managerId) return NextResponse.json({ error: 'Missing managerId' }, { status: 400 })

    const seasonCandidate =
      typeof body?.season === 'number'
        ? body.season
        : typeof body?.season === 'string'
          ? parseInt(body.season, 10)
          : NaN
    const season =
      Number.isFinite(seasonCandidate) && !Number.isNaN(seasonCandidate) ? seasonCandidate : undefined
    const sport = typeof body?.sport === 'string' ? body.sport : undefined

    const reputation = await getReputationByLeagueAndManager(leagueId, managerId, {
      sport,
      season,
    })
    if (!reputation) {
      return NextResponse.json({
        leagueId,
        managerId,
        narrative: 'No reputation record yet. Run the reputation engine in league settings to generate trust scores.',
        source: 'none',
      })
    }

    const evidence = await listEvidenceForManager(leagueId, managerId, {
      sport: reputation.sport,
      season: reputation.season,
      limit: 10,
    }).catch(() => [])

    const parts: string[] = []
    parts.push(`Overall trust: ${reputation.tier} (${reputation.overallScore.toFixed(0)}/100).`)
    parts.push(`Reliability: ${reputation.reliabilityScore.toFixed(0)}. Activity: ${reputation.activityScore.toFixed(0)}. Trade fairness: ${reputation.tradeFairnessScore.toFixed(0)}.`)
    parts.push(`Sportsmanship: ${reputation.sportsmanshipScore.toFixed(0)}. Commissioner trust: ${reputation.commissionerTrustScore.toFixed(0)}. Toxicity risk: ${reputation.toxicityRiskScore.toFixed(0)}.`)
    if (evidence.length > 0) {
      parts.push(
        `Top evidence: ${evidence
          .slice(0, 4)
          .map((row) => `${row.evidenceType}=${Math.round(row.value)}`)
          .join(', ')}.`
      )
    }
    const fallback = parts.join(' ')

    const ai = await openaiChatText({
      messages: [
        {
          role: 'system',
          content:
            'You are a fantasy league trust analyst. Explain this manager reputation in 3-5 concise sentences. Mention strongest strengths, biggest risk, and one practical commissioner action. Keep the explanation grounded in the provided metrics and evidence.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            leagueId,
            managerId,
            reputation: {
              tier: reputation.tier,
              overallScore: reputation.overallScore,
              reliabilityScore: reputation.reliabilityScore,
              activityScore: reputation.activityScore,
              tradeFairnessScore: reputation.tradeFairnessScore,
              sportsmanshipScore: reputation.sportsmanshipScore,
              commissionerTrustScore: reputation.commissionerTrustScore,
              toxicityRiskScore: reputation.toxicityRiskScore,
              participationQualityScore: reputation.participationQualityScore,
              responsivenessScore: reputation.responsivenessScore,
              sport: reputation.sport,
              season: reputation.season,
            },
            evidence: evidence.slice(0, 10).map((row) => ({
              evidenceType: row.evidenceType,
              value: row.value,
              sourceReference: row.sourceReference,
              createdAt: row.createdAt,
            })),
          }),
        },
      ],
      temperature: 0.35,
      maxTokens: 300,
    }).catch(() => null)

    const narrative = ai?.ok && ai.text?.trim() ? ai.text.trim() : fallback

    return NextResponse.json({
      leagueId,
      managerId,
      narrative,
      source: ai?.ok && ai.text?.trim() ? 'ai' : 'reputation_engine',
      tier: reputation.tier,
      overallScore: reputation.overallScore,
    })
  } catch (e) {
    console.error('[reputation/explain POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to explain reputation' },
      { status: 500 }
    )
  }
}
