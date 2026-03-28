/**
 * PROMPT 149 — Onboarding progress and checklist state.
 * Derives completion from profile, league count, and EngagementEvent; records milestones.
 */

import { prisma } from "@/lib/prisma"
import { getSettingsProfile } from "@/lib/user-settings/SettingsQueryService"
import type {
  OnboardingChecklistState,
  OnboardingChecklistTask,
  OnboardingChecklistTaskId,
  OnboardingMilestoneEventType,
} from "./types"

const CHECKLIST_SPEC: Record<
  OnboardingChecklistTaskId,
  { label: string; description: string; href: string; ctaLabel: string }
> = {
  select_sports: {
    label: "Select favorite sports",
    description: "Choose the sports you follow for personalized content.",
    href: "/onboarding/funnel",
    ctaLabel: "Set sports",
  },
  choose_tools: {
    label: "Choose preferred tools",
    description: "Try Trade Analyzer, Mock Draft, Brackets, or Chimmy AI.",
    href: "/af-legacy?tab=trade-center",
    ctaLabel: "Explore tools",
  },
  join_or_create_league: {
    label: "Join or create first league",
    description: "Create a league or join one with a code.",
    href: "/leagues",
    ctaLabel: "Leagues",
  },
  first_ai_action: {
    label: "Try your first AI action",
    description: "Use Chimmy or any AI feature once.",
    href: "/chimmy",
    ctaLabel: "Open Chimmy",
  },
  referral_share: {
    label: "Refer a friend or share",
    description: "Share AllFantasy and grow your league.",
    href: "/referral",
    ctaLabel: "Share",
  },
}

const TASK_ORDER: OnboardingChecklistTaskId[] = [
  "select_sports",
  "choose_tools",
  "join_or_create_league",
  "first_ai_action",
  "referral_share",
]

/**
 * Returns current checklist state from profile, leagues, and engagement events.
 */
export async function getChecklistState(userId: string): Promise<OnboardingChecklistState> {
  const [profile, leagueCount, toolVisit, firstAi, referralShare] = await Promise.all([
    getSettingsProfile(userId),
    (prisma as any).league.count({ where: { userId } }).catch(() => 0),
    prisma.engagementEvent.findFirst({
      where: { userId, eventType: "onboarding_tool_visit" },
      select: { id: true },
    }),
    prisma.engagementEvent.findFirst({
      where: { userId, eventType: "onboarding_first_ai" },
      select: { id: true },
    }),
    prisma.engagementEvent.findFirst({
      where: { userId, eventType: "onboarding_referral_share" },
      select: { id: true },
    }),
  ])

  const preferredSports = profile?.preferredSports
  const hasSports = Array.isArray(preferredSports) && preferredSports.length > 0

  const completed: Record<OnboardingChecklistTaskId, boolean> = {
    select_sports: hasSports,
    choose_tools: !!toolVisit,
    join_or_create_league: leagueCount > 0,
    first_ai_action: !!firstAi,
    referral_share: !!referralShare,
  }

  const tasks: OnboardingChecklistTask[] = TASK_ORDER.map((id) => {
    const spec = CHECKLIST_SPEC[id]
    return {
      id,
      label: spec.label,
      description: spec.description,
      href: spec.href,
      ctaLabel: spec.ctaLabel,
      completed: completed[id],
    }
  })

  const completedCount = tasks.filter((t) => t.completed).length
  const totalCount = tasks.length

  return {
    tasks,
    completedCount,
    totalCount,
    isFullyComplete: completedCount >= totalCount,
  }
}

/**
 * Records an onboarding milestone event (event-based tracking).
 */
export async function recordMilestone(
  userId: string,
  eventType: OnboardingMilestoneEventType,
  meta?: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const dedupeWindowStart = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const recent = await prisma.engagementEvent.findFirst({
      where: {
        userId,
        eventType,
        createdAt: { gte: dedupeWindowStart },
      },
      select: { id: true },
    })
    if (recent) {
      return { ok: true }
    }

    await prisma.engagementEvent.create({
      data: {
        userId,
        eventType,
        meta: meta ?? undefined,
      },
    })
    return { ok: true }
  } catch (e) {
    console.error("[OnboardingProgressService] recordMilestone error:", e)
    return { ok: false, error: "Failed to record milestone" }
  }
}
