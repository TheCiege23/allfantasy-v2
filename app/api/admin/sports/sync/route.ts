import { NextRequest, NextResponse } from "next/server"
import { requireAdminOrBearer } from "@/lib/adminAuth"
import { runAdminSportsSync } from "@/lib/admin-dashboard/AdminSportsSyncService"
import { getAdminPerSportDataReliabilityRows } from "@/lib/admin-dashboard/AdminProviderHealthService"
import {
  getDashboardAiToolAvailability,
  getSportImportMatrix,
} from "@/lib/admin-dashboard/SportImportMatrixService"

export const dynamic = "force-dynamic"

function parseSeason(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) && parsed > 1900 && parsed < 2200 ? parsed : null
}

export async function GET(request: NextRequest) {
  const gate = await requireAdminOrBearer(request)
  if (!gate.ok) return gate.res

  const rows = await getAdminPerSportDataReliabilityRows()
  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    importMatrix: getSportImportMatrix(rows),
    aiToolAvailability: getDashboardAiToolAvailability(rows),
    controls: {
      endpoint: "/api/admin/sports/sync",
      methods: ["GET status", "POST sync"],
      syncTypes: [
        "schedules",
        "injuries",
        "news",
        "players",
        "player_stats",
        "rankings",
        "projections",
        "identity_health",
        "image_audit",
        "fantasy_value_snapshots",
        "all",
      ],
      notes: [
        "Admin/bearer protected.",
        "Public user routes remain cache-only.",
        "Use dryRun=true to preview a sync without provider calls.",
      ],
    },
  })
}

export async function POST(request: NextRequest) {
  const gate = await requireAdminOrBearer(request)
  if (!gate.ok) return gate.res

  const body = (await request.json().catch(() => ({}))) as {
    type?: string
    sports?: unknown
    season?: unknown
    dryRun?: boolean
  }

  try {
    const result = await runAdminSportsSync({
      type: body.type,
      sports: body.sports,
      season: parseSeason(body.season),
      dryRun: body.dryRun === true,
    })
    return NextResponse.json(result, { status: result.ok ? 200 : 429 })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[admin/sports/sync] sync failed:", message)
    return NextResponse.json(
      {
        ok: false,
        error: "Sports sync failed",
        detail: message.slice(0, 240),
      },
      { status: 500 }
    )
  }
}
