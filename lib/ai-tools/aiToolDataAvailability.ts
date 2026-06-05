import "server-only"

import { NextResponse } from "next/server"
import { getAdminPerSportDataReliabilityRows } from "@/lib/admin-dashboard/AdminProviderHealthService"
import { getDashboardAiToolAvailability } from "@/lib/admin-dashboard/SportImportMatrixService"
import { normalizeToSupportedSport } from "@/lib/sport-scope"

export type AiToolAvailabilityId =
  | "startSit"
  | "trade"
  | "waiver"
  | "injury"
  | "power"
  | "matchupPrep"
  | "worldCupAnalysis"
  | "commissionerReport"

export async function checkAiToolDataAvailability(input: {
  toolId: AiToolAvailabilityId
  sportFilter?: string | null
}): Promise<
  | { ok: true }
  | {
      ok: false
      status: number
      body: {
        ok: false
        code: "DATA_UNAVAILABLE"
        error: string
        missingData: string[]
        supportedSports: string[]
        lastSyncedAt: string | null
        tokenChargeBlocked: true
      }
    }
> {
  const rows = await getAdminPerSportDataReliabilityRows()
  const tool = getDashboardAiToolAvailability(rows).find((row) => row.id === input.toolId)
  if (!tool) return { ok: true }

  const requestedSport =
    input.sportFilter && input.sportFilter !== "ALL"
      ? normalizeToSupportedSport(input.sportFilter)
      : null
  const supportsRequestedSport =
    !requestedSport || tool.supportedSports.some((sport) => sport.toUpperCase() === requestedSport)

  if (tool.status === "active" && supportsRequestedSport) return { ok: true }

  const sportNote = requestedSport ? ` for ${requestedSport}` : ""
  return {
    ok: false,
    status: 503,
    body: {
      ok: false,
      code: "DATA_UNAVAILABLE",
      error: `${tool.label} is not ready${sportNote} because required cached sports data is missing or stale. No tokens were charged.`,
      missingData: tool.missingData.length > 0 ? tool.missingData : ["fresh cached sports data"],
      supportedSports: tool.supportedSports,
      lastSyncedAt: tool.lastSyncedAt,
      tokenChargeBlocked: true,
    },
  }
}
export function aiToolDataUnavailableResponse(result: Exclude<Awaited<ReturnType<typeof checkAiToolDataAvailability>>, { ok: true }>) {
  return NextResponse.json(result.body, { status: result.status })
}
