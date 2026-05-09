import "server-only"
import { readFile } from "fs/promises"
import { normalizeManualLivePayload } from "../worldCupLiveScoreNormalizer"
import type {
  NormalizedWorldCupLiveMatch,
  WorldCupLiveScoreAdapter,
} from "./worldCupLiveProviderTypes"

async function loadManualJson(): Promise<unknown | null> {
  const inline = process.env.WORLD_CUP_MANUAL_LIVE_JSON_BODY?.trim()
  if (inline) {
    try {
      return JSON.parse(inline) as unknown
    } catch {
      return null
    }
  }
  const path = process.env.WORLD_CUP_MANUAL_LIVE_JSON?.trim()
  if (!path) return null
  const raw = await readFile(path, "utf8")
  return JSON.parse(raw) as unknown
}

/**
 * Operator-maintained JSON — final fallback. Same schema as manual import payloads.
 */
export class ManualWorldCupLiveProvider implements WorldCupLiveScoreAdapter {
  readonly id = "manual" as const
  readonly label = "Manual JSON"

  isConfigured(): boolean {
    return Boolean(
      process.env.WORLD_CUP_MANUAL_LIVE_JSON_BODY?.trim() ||
        process.env.WORLD_CUP_MANUAL_LIVE_JSON?.trim()
    )
  }

  async fetchLiveMatches(_seasonYear: number): Promise<NormalizedWorldCupLiveMatch[]> {
    if (!this.isConfigured()) return []
    const body = await loadManualJson()
    if (body == null) return []
    return normalizeManualLivePayload(body)
  }
}
