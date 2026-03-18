import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getNudges } from "@/lib/onboarding-retention"

export const dynamic = "force-dynamic"

const REMINDER_TYPES = ["return_nudge", "unfinished_reminder"] as const

/**
 * GET /api/retention/reminders
 * Returns reminder-type retention nudges only (return nudges, unfinished reminders).
 */
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const nudges = await getNudges(session.user.id)
    const reminders = nudges.filter((n) =>
      REMINDER_TYPES.includes(n.type as (typeof REMINDER_TYPES)[number])
    )
    return NextResponse.json({ reminders })
  } catch (e) {
    console.error("[api/retention/reminders]", e)
    return NextResponse.json({ error: "Failed to load reminders" }, { status: 500 })
  }
}
