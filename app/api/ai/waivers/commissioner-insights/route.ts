import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import {
  canUseCommissionerWaiverAI,
  AfCommissionerRequiredError,
} from "@/lib/entitlements/afAccess"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bodySchema = z.object({
  leagueId: z.string().min(1),
})

/**
 * POST /api/ai/waivers/commissioner-insights
 *
 * Returns AI analysis of league waiver settings health, suspicious patterns, and fairness warnings.
 * Requires:
 *   - authenticated session
 *   - commissioner of the league
 *   - AF Commissioner entitlement
 *
 * Recommendation only — does not change settings, does not post to league chat.
 */
export async function POST(request: Request) {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string }
  } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const json = await request.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { leagueId } = parsed.data

  const hasAccess = await canUseCommissionerWaiverAI(userId, leagueId)
  if (!hasAccess) {
    return NextResponse.json(new AfCommissionerRequiredError().toResponse(), { status: 402 })
  }

  try {
    const [league, recentClaims, pendingClaims] = await Promise.all([
      prisma.league.findUnique({
        where: { id: leagueId },
        select: {
          id: true,
          name: true,
          waiverType: true,
          waiverBudget: true,
        },
      }),
      prisma.waiverClaim.findMany({
        where: {
          leagueId,
          status: { in: ["processed", "failed"] },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          rosterId: true,
          addPlayerId: true,
          faabBid: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.waiverClaim.count({ where: { leagueId, status: "pending" } }),
    ])

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 })
    }

    // Analyze claim patterns
    const settingsHealth = analyzeSettingsHealth(league)
    const suspiciousPatterns = detectSuspiciousPatterns(recentClaims)
    const fairnessWarnings = analyzeFairness(recentClaims, league)
    const recommendedSettingsChanges = buildSettingsRecommendations(league, recentClaims)

    return NextResponse.json({
      leagueId,
      settingsHealth,
      suspiciousPatterns,
      fairnessWarnings,
      recommendedSettingsChanges,
      meta: {
        pendingClaimCount: pendingClaims,
        recentClaimCount: recentClaims.length,
        waiverType: league.waiverType ?? "unknown",
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[api/ai/waivers/commissioner-insights]", error)
    return NextResponse.json(
      { error: "Failed to generate commissioner insights" },
      { status: 500 }
    )
  }
}

type LeagueRow = {
  id: string
  name: string | null
  waiverType: string | null
  waiverBudget: number | null
}

type ClaimRow = {
  id: string
  rosterId: string
  addPlayerId: string
  faabBid: number | null
  status: string
  createdAt: Date
}

function analyzeSettingsHealth(league: LeagueRow) {
  const issues: Array<{ code: string; message: string; severity: "info" | "warning" | "error" }> = []

  if (!league.waiverType) {
    issues.push({
      code: "NO_WAIVER_TYPE",
      message: "No waiver type configured. Defaulting to rolling waivers.",
      severity: "warning",
    })
  }

  if (league.waiverType === "faab" && (league.waiverBudget == null || league.waiverBudget <= 0)) {
    issues.push({
      code: "FAAB_BUDGET_MISSING",
      message: "FAAB waiver type requires a positive FAAB budget.",
      severity: "error",
    })
  }

  return issues
}

function detectSuspiciousPatterns(claims: ClaimRow[]) {
  const patterns: Array<{ code: string; message: string; rosterIds?: string[] }> = []

  // Detect rosters with unusually high claim counts
  const countByRoster = new Map<string, number>()
  for (const c of claims) {
    countByRoster.set(c.rosterId, (countByRoster.get(c.rosterId) ?? 0) + 1)
  }
  const highVolumeCutoff = Math.max(5, Math.floor(claims.length / 3))
  const highVolumeRosters = [...countByRoster.entries()]
    .filter(([, count]) => count > highVolumeCutoff)
    .map(([rosterId]) => rosterId)

  if (highVolumeRosters.length > 0) {
    patterns.push({
      code: "HIGH_CLAIM_VOLUME",
      message: `${highVolumeRosters.length} roster(s) submitted unusually high waiver claim counts.`,
      rosterIds: highVolumeRosters,
    })
  }

  return patterns
}

function analyzeFairness(claims: ClaimRow[], league: LeagueRow) {
  const warnings: Array<{ code: string; message: string }> = []

  if (league.waiverType === "faab") {
    const zeroBidClaims = claims.filter(
      (c) => c.faabBid != null && c.faabBid === 0 && c.status === "processed"
    )
    if (zeroBidClaims.length > claims.length * 0.4 && claims.length > 5) {
      warnings.push({
        code: "HIGH_ZERO_BID_RATE",
        message:
          "Over 40% of processed FAAB claims used $0 bids. Consider enforcing a minimum bid.",
      })
    }
  }

  return warnings
}

function buildSettingsRecommendations(league: LeagueRow, claims: ClaimRow[]) {
  const recs: Array<{ code: string; suggestion: string }> = []

  if (!league.waiverType || league.waiverType === "standard") {
    recs.push({
      code: "UPGRADE_WAIVER_TYPE",
      suggestion:
        "Consider switching to FAAB Bidding or Rolling Waivers for more competitive and fair claim resolution.",
    })
  }

  if (claims.length > 20 && league.waiverType === "rolling") {
    recs.push({
      code: "CONSIDER_FAAB",
      suggestion:
        "High claim volume detected. FAAB Bidding distributes value more equitably when many teams compete for the same players.",
    })
  }

  return recs
}
