import "server-only"
import { withWorldCupProviderBudget } from "../worldCupProviderBudget"
import { normalizeManualLivePayload } from "../worldCupLiveScoreNormalizer"
import type {
  NormalizedWorldCupLiveMatch,
  WorldCupLiveScoreAdapter,
} from "./worldCupLiveProviderTypes"

/**
 * Reality Sports / Rolling Insights–class feeds — wire `REALITY_SPORTS_WORLD_CUP_LIVE_URL`
 * to an HTTPS endpoint that returns JSON (array or `{ matches: [] }`) compatible with
 * `coerceNormalizedLiveMatch` keys.
 */
export class RealitySportsWorldCupLiveProvider implements WorldCupLiveScoreAdapter {
  readonly id = "reality_sports" as const
  readonly label = "Reality Sports"

  isConfigured(): boolean {
    return Boolean(process.env.REALITY_SPORTS_WORLD_CUP_LIVE_URL?.trim())
  }

  async fetchLiveMatches(seasonYear: number): Promise<NormalizedWorldCupLiveMatch[]> {
    const urlTemplate = process.env.REALITY_SPORTS_WORLD_CUP_LIVE_URL?.trim()
    if (!urlTemplate) return []

    const url = new URL(urlTemplate)
    url.searchParams.set("season", String(seasonYear))

    const headers: Record<string, string> = {}
    const token = process.env.REALITY_SPORTS_API_KEY?.trim()
    if (token) {
      headers.Authorization = `Bearer ${token}`
      headers["x-api-key"] = token
    }

    const body = await withWorldCupProviderBudget("rolling_insights", "world_cup:fixtures:today", async () => {
      const res = await fetch(url.toString(), { cache: "no-store", headers })
      if (!res.ok) {
        const error = new Error(`Reality Sports live fetch failed: ${res.status}`) as Error & { status?: number }
        error.status = res.status
        throw error
      }
      return res.json()
    })
    return normalizeManualLivePayload(body)
  }
}
