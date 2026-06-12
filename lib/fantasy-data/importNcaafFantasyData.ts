/**
 * NCAAF fantasy data import service.
 * NCAAF data (devy/C2C) requires the CFBD provider key. Without it, returns
 * a structured "provider unavailable" result so the UI/AI can show the correct
 * beta/pending state instead of crashing or hallucinating data.
 */
import "server-only"
import { runSportsDataImporter } from "@/lib/workers/sports-data-importer"
import { runScheduleImporter } from "@/lib/workers/schedule-importer"
import { prisma } from "@/lib/prisma"
import type { FantasyImportSummary } from "./importNflFantasyData"

export type NcaafImportMode = "redraft" | "devy" | "c2c" | "all"

function currentSeason(): number {
  return new Date().getFullYear()
}

function checkNcaafEnv(): { missingEnv: string[]; providerAvailable: boolean } {
  const missingEnv: string[] = []

  const hasCfbd =
    Boolean(process.env.CFBD_API_KEY) || Boolean(process.env.COLLEGE_FOOTBALL_DATA_API_KEY)

  if (!hasCfbd) {
    missingEnv.push("CFBD_API_KEY (CollegeFootballData) — required for NCAAF player data")
  }

  if (!process.env.API_SPORTS_KEY && !process.env.X_RAPIDAPI_KEY) {
    missingEnv.push("API_SPORTS_KEY — needed for NCAAF schedules/scores fallback")
  }

  return {
    missingEnv,
    providerAvailable: hasCfbd,
  }
}

async function recordImportRun(params: {
  sport: string
  rowsWritten: number
  status: string
  errorMessage?: string | null
}): Promise<void> {
  try {
    await (prisma as any).syncJobRun.create({
      data: {
        jobName: "import-ncaaf-fantasy-data",
        jobScope: params.sport,
        trigger: "api",
        status: params.status,
        rowsRead: 0,
        rowsWritten: params.rowsWritten,
        rowsSkipped: 0,
        errorMessage: params.errorMessage ?? null,
        startedAt: new Date(),
        completedAt: new Date(),
        durationMs: 0,
      },
    })
  } catch {
    // non-critical
  }
}

export async function importNcaafFantasyData(options?: {
  season?: number
  dryRun?: boolean
  mode?: NcaafImportMode
}): Promise<FantasyImportSummary> {
  const startedAt = new Date()
  const season = options?.season ?? currentSeason()
  const dryRun = options?.dryRun ?? false
  const { missingEnv, providerAvailable } = checkNcaafEnv()

  // If CFBD is missing, return a structured "provider unavailable" result.
  // This is the correct behaviour for devy/C2C beta state — no hallucinated data.
  if (!providerAvailable) {
    return {
      ok: false,
      sport: "NFL" as "NFL", // typed as NFL but scope is NCAAF — use evidence sport field in callers
      provider: "none",
      season,
      counts: { players: 0, adp: 0, injuries: 0, schedules: 0 },
      skipped: 0,
      missingEnv,
      stale: true,
      warnings: [
        "NCAAF provider key (CFBD_API_KEY) is not configured. " +
          "NCAAF devy/C2C data is in beta — no player data is available until the provider is connected.",
        "Devy and C2C leagues will show 'player pool pending' state. This is expected.",
      ],
      errors: [],
      durationMs: 0,
      startedAt: startedAt.toISOString(),
      completedAt: startedAt.toISOString(),
      dryRun,
    }
  }

  const errors: string[] = []
  const warnings = missingEnv.map((k) => `Missing env: ${k}`)
  let playersImported = 0
  let schedulesImported = 0
  let skipped = 0

  // ── Players ──────────────────────────────────────────────────────────────────
  try {
    if (!dryRun) {
      const result = await runSportsDataImporter({ sports: ["NCAAF"] })
      playersImported = result.imported
      if (result.staleFallbackApplied) {
        warnings.push("NCAAF player import used stale fallback.")
      }
    } else {
      skipped += 1
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`NCAAF player import failed: ${msg.slice(0, 200)}`)
  }

  // ── Schedules ─────────────────────────────────────────────────────────────────
  try {
    if (!dryRun) {
      const result = await runScheduleImporter({
        sports: ["NCAAF"],
        season,
      })
      schedulesImported = result.imported
    } else {
      skipped += 1
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    warnings.push(`NCAAF schedule import failed (non-critical): ${msg.slice(0, 200)}`)
  }

  const completedAt = new Date()
  const totalWritten = playersImported + schedulesImported

  if (!dryRun) {
    await recordImportRun({
      sport: "NCAAF",
      rowsWritten: totalWritten,
      status: errors.length > 0 ? "partial" : "completed",
      errorMessage: errors.length > 0 ? errors[0] : null,
    })
  }

  return {
    ok: errors.length === 0,
    sport: "NFL" as "NFL",
    provider: "cfbd+api_sports",
    season,
    counts: {
      players: playersImported,
      adp: 0, // NCAAF ADP not yet available via mainstream providers
      injuries: 0,
      schedules: schedulesImported,
    },
    skipped,
    missingEnv,
    stale: false,
    warnings,
    errors,
    durationMs: completedAt.getTime() - startedAt.getTime(),
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    dryRun,
  }
}
