import type { Metadata } from "next"
import Link from "next/link"
import { PublicLeagueDiscoveryPage } from "@/components/discovery"
import { SUPPORTED_SPORTS } from "@/lib/sport-scope"

export const dynamic = "force-dynamic"

const TITLE = "Discover Leagues | AllFantasy – Public & Creator Leagues"
const DESCRIPTION =
  "Browse public leagues, creator leagues, and bracket competitions. Filter by sport, format, and join open leagues. NFL, NHL, NBA, MLB, NCAA, Soccer."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/discover/leagues",
  },
}

export default function DiscoverLeaguesPage() {
  return (
    <div className="min-h-screen mode-surface mode-readable">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href="/"
          className="text-sm font-medium mb-6 inline-block"
          style={{ color: "var(--muted)" }}
        >
          ← Home
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "var(--text)" }}>
          Discover leagues
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
          Browse public brackets and creator leagues. Filter by sport, format, and join before they fill.
        </p>
        <PublicLeagueDiscoveryPage />
      </div>
    </div>
  )
}
