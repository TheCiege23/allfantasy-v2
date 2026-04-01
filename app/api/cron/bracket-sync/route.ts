import { NextResponse } from "next/server"
import { runPECR } from "@/lib/ai/pecr"
import { runBracketSync } from "@/lib/bracket-sync"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

class BracketSyncUnauthorizedError extends Error {
  constructor() {
    super("Unauthorized")
    this.name = "BracketSyncUnauthorizedError"
  }
}

function requireCron(req: Request): boolean {
  const provided =
    req.headers.get("x-cron-secret") ?? req.headers.get("x-admin-secret") ?? ""
  const cronSecret = process.env.BRACKET_CRON_SECRET
  const adminSecret =
    process.env.BRACKET_ADMIN_SECRET || process.env.ADMIN_PASSWORD
  return !!(
    provided &&
    ((cronSecret && provided === cronSecret) ||
      (adminSecret && provided === adminSecret))
  )
}

export async function POST(req: Request) {
  const url = new URL(req.url)
  const seasonParam = url.searchParams.get("season")
  let season: number

  if (seasonParam) {
    season = parseInt(seasonParam, 10)
    if (isNaN(season)) {
      return NextResponse.json(
        { error: "Invalid season parameter" },
        { status: 400 }
      )
    }
  } else {
    const now = new Date()
    season = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear()
  }

  try {
    const pecrResult = await runPECR(
      { req, season },
      {
        feature: "cron-bracket-sync",
        plan: async ({ req: request }) => ({
          intent: "sync",
          steps: ["validate auth", "run sync", "verify result"],
          context: { authorized: requireCron(request) },
          refineHints: [],
        }),
        execute: async (plan, input) => {
          if (plan.context.authorized !== true) {
            throw new BracketSyncUnauthorizedError()
          }

          return runBracketSync(input.season)
        },
        check: (output) => ({
          passed: output !== null && output !== undefined,
          failures: output === null ? ["sync returned null"] : [],
        }),
      }
    )

    const status = pecrResult.output.ok ? 200 : 409
    return NextResponse.json(pecrResult.output, { status })
  } catch (err: unknown) {
    if (err instanceof BracketSyncUnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.error("[BracketCronSync] Error:", err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
