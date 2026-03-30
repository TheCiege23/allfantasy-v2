import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league-access'
import { withApiUsage } from '@/lib/telemetry/usage'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import { runWaiverAIService } from '@/lib/waiver-ai-engine'
import {
  FeatureGateService,
  isFeatureGateAccessError,
} from '@/lib/subscription/FeatureGateService'

const SUPPORTED_SPORTS_ENUM = SUPPORTED_SPORTS as [
  (typeof SUPPORTED_SPORTS)[number],
  ...(typeof SUPPORTED_SPORTS)[number][],
]

const LeagueSettingsSchema = z.object({
  isSF: z.boolean().optional(),
  isTEP: z.boolean().optional(),
  numTeams: z.number().int().min(2).max(40).optional(),
  isDynasty: z.boolean().optional(),
})

const AssetValueSchema = z.object({
  impactValue: z.number().optional(),
  marketValue: z.number().optional(),
  vorpValue: z.number().optional(),
  volatility: z.number().optional(),
})

const AvailablePlayerSchema = z.object({
  playerId: z.string().optional(),
  id: z.string().optional(),
  playerName: z.string().optional(),
  name: z.string().optional(),
  position: z.string().optional(),
  team: z.string().nullable().optional(),
  age: z.number().nullable().optional(),
  value: z.number().optional(),
  assetValue: AssetValueSchema.optional(),
  source: z.string().optional(),
})

const RosterPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: z.string(),
  team: z.string().nullable(),
  slot: z.enum(['starter', 'bench', 'ir', 'taxi']),
  age: z.number().nullable(),
  value: z.number(),
})

const TeamNeedsSchema = z.object({
  weakestSlots: z
    .array(
      z.object({
        slot: z.string(),
        position: z.string(),
        currentPlayer: z.string().nullable(),
        currentValue: z.number(),
        leagueMedianValue: z.number(),
        gap: z.number(),
        gapPpg: z.number(),
      })
    )
    .default([]),
  biggestNeed: z
    .object({
      slot: z.string(),
      position: z.string(),
      currentPlayer: z.string().nullable(),
      currentValue: z.number(),
      leagueMedianValue: z.number(),
      gap: z.number(),
      gapPpg: z.number(),
    })
    .nullable()
    .default(null),
  byeWeekClusters: z
    .array(
      z.object({
        week: z.number(),
        playersOut: z.array(z.string()),
        positionsAffected: z.array(z.string()),
        severity: z.enum(['critical', 'moderate', 'minor']),
      })
    )
    .default([]),
  positionalDepth: z
    .array(
      z.object({
        position: z.string(),
        count: z.number(),
        leagueMedianCount: z.number(),
        totalValue: z.number(),
        leagueMedianValue: z.number(),
        depthRating: z.number(),
      })
    )
    .default([]),
  dropCandidates: z
    .array(
      z.object({
        playerId: z.string(),
        playerName: z.string(),
        position: z.string(),
        value: z.number(),
        riskOfRegret: z.number(),
        riskLabel: z.string(),
        reason: z.string(),
      })
    )
    .default([]),
})

const RequestSchema = z.object({
  sport: z.enum(SUPPORTED_SPORTS_ENUM).optional(),
  leagueId: z.string().min(1).optional(),
  includeAIExplanation: z.boolean().optional(),
  roster: z.array(RosterPlayerSchema).optional(),
  teamNeeds: TeamNeedsSchema.optional(),
  rosterPositions: z.array(z.string()).optional(),
  allLeagueRosters: z.array(z.object({ players: z.array(RosterPlayerSchema) })).optional(),
  currentWeek: z.number().int().min(1).max(30).optional(),
  goal: z.enum(['win-now', 'balanced', 'rebuild']).optional(),
  leagueSettings: LeagueSettingsSchema.default({}),
  availablePlayers: z.array(AvailablePlayerSchema).min(1),
  maxResults: z.number().int().min(1).max(25).optional(),
})

export const dynamic = 'force-dynamic'

export const POST = withApiUsage({
  endpoint: '/api/waiver-ai/engine',
  tool: 'WaiverAiEngine',
})(async (request: NextRequest) => {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const gate = new FeatureGateService()
    await gate.assertUserHasFeature(session.user.id, 'ai_waivers')

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = RequestSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request payload', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const input = parsed.data
    if (input.leagueId) {
      try {
        await assertLeagueMember(input.leagueId, session.user.id)
      } catch {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const analysis = await runWaiverAIService(input)
    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    if (isFeatureGateAccessError(error)) {
      return NextResponse.json(
        {
          error: 'Premium feature',
          code: error.code,
          message: error.message,
          requiredPlan: error.requiredPlan,
          upgradePath: error.upgradePath,
        },
        { status: error.statusCode }
      )
    }
    console.error('[waiver-ai/engine]', error)
    return NextResponse.json({ error: 'Waiver AI failed' }, { status: 500 })
  }
})
