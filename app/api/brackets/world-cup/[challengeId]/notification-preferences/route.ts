import { NextResponse } from "next/server"
import { z } from "zod"
import {
  getWorldCupNotificationPreferenceResolution,
  updateWorldCupNotificationPreferencesForUser,
} from "@/lib/world-cup/worldCupNotificationPreferences"
import {
  assertWorldCupChallengeMemberOrManager,
  requireWorldCupApiUser,
  worldCupChallengeParamsSchema,
} from "../../_utils"

export const runtime = "nodejs"

const preferencePatchSchema = z.object({
  poolMuted: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  usernameMentionsEnabled: z.boolean().optional(),
  allMentionsEnabled: z.boolean().optional(),
  commissionerAnnouncementsEnabled: z.boolean().optional(),
  deadlineRemindersEnabled: z.boolean().optional(),
  bracketFinalizedEnabled: z.boolean().optional(),
  resultsUpdatedEnabled: z.boolean().optional(),
  leaderboardUpdatedEnabled: z.boolean().optional(),
  generalChatEnabled: z.boolean().optional(),
  chimmyRepliesEnabled: z.boolean().optional(),
  globalBroadcastEnabled: z.boolean().optional(),
})

export async function GET(
  request: Request,
  context: { params: { challengeId: string } }
) {
  const auth = await requireWorldCupApiUser(request)
  if (!auth.ok) return auth.response

  const params = worldCupChallengeParamsSchema.safeParse(context.params)
  if (!params.success) {
    return NextResponse.json({ error: "Invalid challenge id" }, { status: 400 })
  }

  const access = await assertWorldCupChallengeMemberOrManager(request, params.data.challengeId, auth.user)
  if (!access.ok) return access.response

  const resolution = await getWorldCupNotificationPreferenceResolution(auth.user.id, params.data.challengeId)
  return NextResponse.json({
    preferences: resolution.preferences,
    phoneVerified: resolution.phoneVerified,
    phoneVerificationRequiredForSms: true,
  })
}

export async function PATCH(
  request: Request,
  context: { params: { challengeId: string } }
) {
  const auth = await requireWorldCupApiUser(request)
  if (!auth.ok) return auth.response

  const params = worldCupChallengeParamsSchema.safeParse(context.params)
  if (!params.success) {
    return NextResponse.json({ error: "Invalid challenge id" }, { status: 400 })
  }

  const access = await assertWorldCupChallengeMemberOrManager(request, params.data.challengeId, auth.user)
  if (!access.ok) return access.response

  const json = await request.json().catch(() => ({}))
  const parsed = preferencePatchSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid preferences", issues: parsed.error.flatten() }, { status: 400 })
  }

  const result = await updateWorldCupNotificationPreferencesForUser({
    userId: auth.user.id,
    challengeId: params.data.challengeId,
    patch: parsed.data,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed to save preferences" }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    preferences: result.preferences,
    phoneVerificationRequiredForSms: true,
  })
}
