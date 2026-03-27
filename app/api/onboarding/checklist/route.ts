import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getChecklistState, recordMilestone } from "@/lib/onboarding-retention"
import type { OnboardingMilestoneEventType } from "@/lib/onboarding-retention"
import { recordReferralOnboardingStep } from "@/lib/referral"

export const dynamic = "force-dynamic"

/**
 * GET /api/onboarding/checklist
 * Returns current onboarding checklist state (tasks, completed count).
 */
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const state = await getChecklistState(session.user.id)
    return NextResponse.json(state)
  } catch (e) {
    console.error("[api/onboarding/checklist] GET error:", e)
    return NextResponse.json({ error: "Failed to load checklist" }, { status: 500 })
  }
}

const VALID_MILESTONES: OnboardingMilestoneEventType[] = [
  "onboarding_sport_selection",
  "onboarding_tool_visit",
  "onboarding_first_league",
  "onboarding_first_ai",
  "onboarding_referral_share",
]

/**
 * POST /api/onboarding/checklist
 * Body: { milestone?: OnboardingMilestoneEventType, meta?: object }
 * Records a milestone event (e.g. first_ai, tool_visit, referral_share).
 */
export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const milestone = body.milestone as OnboardingMilestoneEventType | undefined
  const meta = (body.meta as Record<string, unknown>) ?? undefined

  if (!milestone || !VALID_MILESTONES.includes(milestone)) {
    return NextResponse.json({ error: "Invalid milestone" }, { status: 400 })
  }

  const result = await recordMilestone(session.user.id, milestone, meta)
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed to record" }, { status: 400 })
  }

  await recordReferralOnboardingStep(session.user.id, milestone, meta).catch(() => null)

  const state = await getChecklistState(session.user.id)
  return NextResponse.json(state)
}
