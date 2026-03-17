import Link from "next/link"
import { areBracketChallengesEnabled } from "@/lib/feature-toggle"
import LeagueDiscoveryClient from "./LeagueDiscoveryClient"

export const dynamic = "force-dynamic"

export default async function DiscoverLeaguesPage() {
  const enabled = await areBracketChallengesEnabled()
  if (!enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="rounded-xl border p-6 max-w-md text-center" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--muted)" }}>League discovery is not available right now.</p>
          <Link href="/brackets" className="mt-3 inline-block text-sm font-medium" style={{ color: "var(--accent)" }}>Back to Brackets</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mode-surface mode-readable">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/brackets"
            className="text-sm font-medium"
            style={{ color: "var(--muted)" }}
          >
            ← Brackets
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            Discover leagues
          </h1>
        </div>
        <p className="mb-6 text-sm" style={{ color: "var(--muted)" }}>
          Browse by sport, league type, entry fee, and visibility. Click a league to view or join.
        </p>
        <LeagueDiscoveryClient />
      </div>
    </div>
  )
}
