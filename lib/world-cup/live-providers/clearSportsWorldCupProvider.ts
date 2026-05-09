import "server-only"
import { normalizeManualLivePayload } from "../worldCupLiveScoreNormalizer"
import type {
  NormalizedWorldCupLiveMatch,
  WorldCupLiveScoreAdapter,
} from "./worldCupLiveProviderTypes"

/**
 * ClearSports — point `CLEARSPORTS_WORLD_CUP_LIVE_URL` at your soccer tournament endpoint.
 * Payload shape matches manual JSON (normalized rows or loose TSDB-like rows).
 */
export class ClearSportsWorldCupLiveProvider implements WorldCupLiveScoreAdapter {
  readonly id = "clear_sports" as const
  readonly label = "ClearSports"

  isConfigured(): boolean {
    return Boolean(process.env.CLEARSPORTS_WORLD_CUP_LIVE_URL?.trim())
  }

  async fetchLiveMatches(seasonYear: number): Promise<NormalizedWorldCupLiveMatch[]> {
    const urlTemplate = process.env.CLEARSPORTS_WORLD_CUP_LIVE_URL?.trim()
    if (!urlTemplate) return []

    const url = new URL(urlTemplate)
    url.searchParams.set("season", String(seasonYear))

    const headers: Record<string, string> = {}
    const key = process.env.CLEARSPORTS_API_KEY?.trim()
    if (key) {
      headers.Authorization = `Bearer ${key}`
      headers["x-api-key"] = key
    }

    const res = await fetch(url.toString(), { cache: "no-store", headers })
    if (!res.ok) {
      throw new Error(`ClearSports live fetch failed: ${res.status}`)
    }
    const body = await res.json()
    return normalizeManualLivePayload(body)
  }
}
