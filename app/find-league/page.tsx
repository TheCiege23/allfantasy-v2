import type { Metadata } from "next"
import Link from "next/link"
import { FindLeagueClient } from "./FindLeagueClient"

export const dynamic = "force-dynamic"

const TITLE = "Find a League | AllFantasy – Discover Leagues to Join"
const DESCRIPTION =
  "Discover leagues you can join across NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, and Soccer. Filter by sport, league type, draft type, team count, and more."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/find-league",
  },
}

export default function FindLeaguePage() {
  return (
    <div className="min-h-screen mode-surface mode-readable">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Link
          href="/"
          className="text-sm font-medium mb-6 inline-block"
          style={{ color: "var(--muted)" }}
        >
          ← Home
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "var(--text)" }}>
          Find a league
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
          Discover leagues across all supported sports. Filter by sport, league type, draft type,
          team count, entry fee, and more. Join with one click.
        </p>
        <FindLeagueClient />
      </div>
    </div>
  )
}
