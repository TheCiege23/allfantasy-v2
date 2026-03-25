import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  ONBOARDING_STEPS,
  getOnboardingState,
  advanceOnboardingStep,
  completeOnboardingFunnel,
  setPreferredSports,
} from "@/lib/onboarding-funnel"
import type { OnboardingStepId } from "@/lib/onboarding-funnel"
import { recordMilestone } from "@/lib/onboarding-retention"

export const dynamic = "force-dynamic"

/**
 * GET /api/onboarding/funnel
 * Returns current onboarding step and completion state.
 */
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const state = await getOnboardingState(session.user.id)
  if (!state) {
    return NextResponse.json({
      currentStep: "welcome",
      completedAt: null,
      isComplete: false,
    })
  }
  return NextResponse.json(state)
}

/**
 * POST /api/onboarding/funnel
 * Advance to next step or complete funnel. Body: { step, completeFunnel?, preferredSports? }.
 * When step is sport_selection, preferredSports is saved to profile.
 */
export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const step = body.step as OnboardingStepId | undefined
  const completeFunnel = !!body.completeFunnel
  const preferredSports = body.preferredSports as string[] | undefined

  if (!step || !ONBOARDING_STEPS.includes(step)) {
    return NextResponse.json(
      { error: "Invalid step", nextStep: step ?? "welcome" },
      { status: 400 }
    )
  }

  if (step === "sport_selection" && Array.isArray(preferredSports)) {
    const saveResult = await setPreferredSports(session.user.id, preferredSports)
    if (!saveResult.ok) {
      return NextResponse.json(
        { error: saveResult.error ?? "Failed to save preferences" },
        { status: 400 }
      )
    }
    if (preferredSports.length > 0) {
      void recordMilestone(session.user.id, "onboarding_sport_selection", {
        source: "onboarding_funnel",
        sportsCount: preferredSports.length,
      })
    }
  }

  if (completeFunnel) {
    const result = await completeOnboardingFunnel(session.user.id)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Failed to complete onboarding" },
        { status: 400 }
      )
    }
    return NextResponse.json({ ok: true, nextStep: "completed" })
  }

  const result = await advanceOnboardingStep(session.user.id, { step, completeFunnel: false })
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed to save progress" },
      { status: 400 }
    )
  }
  return NextResponse.json({ ok: true, nextStep: result.nextStep })
}
