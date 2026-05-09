import { NextResponse } from "next/server"
import { z } from "zod"

import { requireAdminOrBearer } from "@/lib/adminAuth"
import { processLeagueWaiversJob } from "@/lib/automation/jobs/waivers/processLeagueWaiversJob"
import { toErrorMessage } from "@/lib/automation/errors"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bodySchema = z.object({
  leagueId: z.string().min(1),
  dryRun: z.boolean().optional().default(false),
})

/**
 * POST /api/admin/automation/waivers/run
 * Manual/automation trigger for a single league (admin session, bearer, or cron-style secret via `requireAdminOrBearer`).
 *
 * Does not replace `POST /api/waiver-wire/leagues/[leagueId]/process` (member/commissioner UX); this is operator-focused.
 */
export async function POST(request: Request) {
  const gate = await requireAdminOrBearer(request)
  if (!gate.ok) return gate.res

  const json = await request.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const result = await processLeagueWaiversJob({
      leagueId: parsed.data.leagueId,
      trigger: "admin",
      dryRun: parsed.data.dryRun,
      actorUserId: gate.user?.id ?? null,
      scheduledFor: new Date(),
    })

    return NextResponse.json({
      ok: result.ok,
      result,
    })
  } catch (error: unknown) {
    console.error("[api/admin/automation/waivers/run]", error)
    const msg =
      process.env.NODE_ENV === "production"
        ? "Failed to run waiver job"
        : toErrorMessage(error)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
