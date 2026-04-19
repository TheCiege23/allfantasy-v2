import 'server-only'

import { buildAiToolPayload } from '@/lib/intelligence/buildAiToolPayload'
import { openaiChatText } from '@/lib/openai-client'
import { buildLongTermCoachingAnalysis } from '@/lib/long-term-coaching/buildLongTermCoachingAnalysis'
import type {
  LongTermCoachingAnalysis,
  LongTermCoachingHorizonYears,
  LongTermCoachingResult,
  LongTermStrategyMode,
} from '@/lib/long-term-coaching/types'

function isAnalysis(v: unknown): v is LongTermCoachingAnalysis {
  return typeof v === 'object' && v !== null && 'schemaVersion' in v && (v as LongTermCoachingAnalysis).schemaVersion === 1
}

export async function runLongTermCoaching(args: {
  userId: string
  leagueId: string
  horizonYears: LongTermCoachingHorizonYears
  strategyMode: LongTermStrategyMode
  teamExternalId?: string | null
  skipAi?: boolean
}): Promise<LongTermCoachingResult | { ok: false; code: string; message: string }> {
  const raw = await buildLongTermCoachingAnalysis({
    userId: args.userId,
    leagueId: args.leagueId,
    horizonYears: args.horizonYears,
    strategyMode: args.strategyMode,
    teamExternalId: args.teamExternalId ?? null,
  })

  if (!isAnalysis(raw)) {
    return { ok: false, code: raw.code, message: raw.message }
  }
  const analysis = raw

  if (args.skipAi) {
    return { ok: true, analysis, aiNarrative: null, aiModel: null }
  }

  const leagueName = analysis.leagueContext.leagueName ?? 'League'
  const sport = analysis.sport

  const envelope = await buildAiToolPayload({
    userId: args.userId,
    tool: 'long_term_coaching',
    mode: 'league',
    league: { leagueId: args.leagueId, leagueName: analysis.leagueContext.leagueName, sport },
    data: {
      horizonYears: args.horizonYears,
      strategyMode: args.strategyMode,
    },
    enrichTimeFromLeagueId: args.leagueId,
    includeHealth: false,
    includeTeamContext: true,
    preferredTeamExternalId: args.teamExternalId ?? null,
  })

  const coachPayload = {
    horizonYears: args.horizonYears,
    strategyMode: args.strategyMode,
    deterministic: {
      strategyClass: analysis.signals.strategyClass,
      recommendedDirection: analysis.plan.recommendedDirection,
      shortTermStrengthIndex: analysis.signals.shortTermStrengthIndex,
      longTermAssetIndex: analysis.signals.longTermAssetIndex,
      pickCapitalScore: analysis.signals.pickCapitalScore,
      pointsForPercentile: analysis.pointsForPercentile,
      yearOutlooks: analysis.yearOutlooks,
      plan: analysis.plan,
      methodologyNotes: analysis.methodologyNotes,
      formatWarning: analysis.formatWarning,
      scoringLabels: analysis.leagueContext.scoring.labels,
      flags: analysis.leagueContext.flags,
    },
    learningLayers: envelope.standard.learningLayers ?? null,
    teamContext: envelope.standard.teamContext,
    leagueContextSummary: {
      leagueId: analysis.leagueContext.leagueId,
      sport: analysis.leagueContext.sport,
      trade: analysis.leagueContext.trade,
      roster: analysis.leagueContext.roster,
    },
  }

  const userContent = JSON.stringify(coachPayload).slice(0, 120_000)

  const ai = await openaiChatText({
    temperature: 0.45,
    maxTokens: 2200,
    skipCache: true,
    messages: [
      {
        role: 'system',
        content: `You are Chimmy, AllFantasy's calm strategic coach. Explain the deterministic analysis below in clear prose.
Rules:
- Do not invent players, picks, or stats not present in the JSON.
- State uncertainty where dynasty value coverage is low or projections are missing.
- Respect superflex, TE premium, and IDP flags when giving positional advice.
- Tie recommendations to the user's selected horizon (${args.horizonYears} years) and strategy mode (${args.strategyMode}).
Output sections: Summary, Contend vs rebuild, Title window read, Plan highlights, Risks, Next steps.`,
      },
      {
        role: 'user',
        content: `League: ${leagueName} (${sport}).\n\nStructured coaching payload:\n${userContent}`,
      },
    ],
  })

  if (!ai.ok) {
    return { ok: true, analysis, aiNarrative: null, aiModel: null }
  }

  return { ok: true, analysis, aiNarrative: ai.text, aiModel: ai.model }
}
