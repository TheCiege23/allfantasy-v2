/**
 * NFL fantasy data import service.
 * Orchestrates player, ADP, injury, and schedule imports for NFL leagues.
 * All imports are idempotent/upsert-based. Missing provider keys return
 * a structured "provider unavailable" result instead of throwing.
 */
import "server-only"
import { runSportsDataImporter } from "@/lib/workers/sports-data-importer"
import { runAdpImporter } from "@/lib/workers/adp-importer"
import { runInjuryImporter } from "@/lib/workers/injury-importer"
import { runScheduleImporter } from "@/lib/workers/schedule-importer"
import { prisma } from "@/lib/prisma"

export type FantasyImportSummary = {
  ok: boolean
  sport: "NFL"
  provider: string
  season: number
  counts: {
    players: number
    adp: number
    injuries: number
    schedules: number
  }
  skipped: number
  missingEnv: string[]
  stale: boolean
  warnings: string[]
  errors: string[]
  durationMs: number
  startedAt: string
  completedAt: string
  dryRun: boolean
}

function currentSeason(): number {
  return new Date().getFullYear()
}

function checkNflEnv(): string[] {
  const missing: string[] = []
  if (!process.env.ROLLING_INSIGHTS_API_KEY && !process.env.ROLLING_INSIGHTS_API_SECRET) {
    missing.push("ROLLING_INSIGHTS_API_KEY")
  }
  if (!process.env.API_SPORTS_KEY && !process.env.X_RAPIDAPI_KEY) {
    missing.push("API_SPORTS_KEY")
  }
  return missing
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
        jobName: "import-nfl-fantasy-data",
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

export async function importNflFantasyData(options?: {
  season?: number
  dryRun?: boolean
  sports?: string[]
  week?: number
}): Promise<FantasyImportSummary> {
  const startedAt = new Date()
  const season = options?.season ?? currentSeason()
  const dryRun = options?.dryRun ?? false
  const missingEnv = checkNflEnv()
  const warnings: string[] = [...missingEnv.map((k) => `Missing env: ${k}`)]
  const errors: string[] = []

  let playersImported = 0
  let adpImported = 0
  let injuriesImported = 0
  let schedulesImported = 0
  let skipped = 0

  if (missingEnv.length > 0) {
    warnings.push("NFL provider keys are missing — running with cached/fallback data only.")
  }

  // ── Players ──────────────────────────────────────────────────────────────────
  try {
    if (!dryRun) {
      const result = await runSportsDataImporter({ sports: ["NFL"] })
      playersImported = result.imported
      if (result.staleFallbackApplied) {
        warnings.push("NFL player import used stale fallback — provider may be unavailable.")
      }
    } else {
      skipped += 1
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`Player import failed: ${msg.slice(0, 200)}`)
  }

  // ── ADP ───────────────────────────────────────────────────────────────────────
  try {
    if (!dryRun) {
      const result = await runAdpImporter({ sports: ["NFL"] })
      adpImported = result.imported
    } else {
      skipped += 1
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`ADP import failed: ${msg.slice(0, 200)}`)
  }

  // ── Injuries ─────────────────────────────────────────────────────────────────
  try {
    if (!dryRun) {
      const result = await runInjuryImporter({
        sports: ["NFL"],
        week: options?.week,
      })
      injuriesImported = result.imported
    } else {
      skipped += 1
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    warnings.push(`Injury import failed (non-critical): ${msg.slice(0, 200)}`)
  }

  // ── Schedules ─────────────────────────────────────────────────────────────────
  try {
    if (!dryRun) {
      const result = await runScheduleImporter({
        sports: ["NFL"],
        season,
      })
      schedulesImported = result.imported
    } else {
      skipped += 1
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    warnings.push(`Schedule import failed (non-critical): ${msg.slice(0, 200)}`)
  }

  const completedAt = new Date()
  const totalWritten = playersImported + adpImported + injuriesImported + schedulesImported

  if (!dryRun) {
    await recordImportRun({
      sport: "NFL",
      rowsWritten: totalWritten,
      status: errors.length > 0 ? "partial" : "completed",
      errorMessage: errors.length > 0 ? errors[0] : null,
    })
  }

  return {
    ok: errors.length === 0 || totalWritten > 0,
    sport: "NFL",
    provider: missingEnv.length === 0 ? "rolling_insights+api_sports+sleeper" : "sleeper+cache",
    season,
    counts: {
      players: playersImported,
      adp: adpImported,
      injuries: injuriesImported,
      schedules: schedulesImported,
    },
    skipped,
    missingEnv,
    stale: missingEnv.length > 0,
    warnings,
    errors,
    durationMs: completedAt.getTime() - startedAt.getTime(),
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    dryRun,
  }
}
