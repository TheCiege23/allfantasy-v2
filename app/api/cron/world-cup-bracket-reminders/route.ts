import { NextResponse } from "next/server"
import { runWorldCupBracketLockReminders } from "@/lib/world-cup/worldCupLockReminderCron"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const secret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await runWorldCupBracketLockReminders()
  return NextResponse.json({ ok: true, ...result })
}
