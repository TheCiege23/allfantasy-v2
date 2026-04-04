import { NextRequest, NextResponse } from "next/server"
import { requireCronAuth } from "@/app/api/cron/_auth"
import { syncAllActiveSubscribers } from "@/lib/subscription/syncBridge"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

async function runAuthorizedSync(req: NextRequest) {
  if (!requireCronAuth(req, "CRON_SECRET")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await syncAllActiveSubscribers()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error("[subscription/sync-profiles]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}

/** Vercel Cron invokes GET. */
export async function GET(req: NextRequest) {
  return runAuthorizedSync(req)
}

/** Manual / alternate triggers may use POST. */
export async function POST(req: NextRequest) {
  return runAuthorizedSync(req)
}
