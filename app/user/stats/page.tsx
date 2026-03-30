import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { UserStatsClient } from "./UserStatsClient"
import { getCrossLeagueUserStats } from "@/lib/user-stats"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Your stats | AllFantasy",
  description: "Your performance across all leagues: wins, championships, playoff appearances, draft grades, trade success.",
}

export default async function UserStatsPage() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/user/stats")
  }

  let stats = null
  let error: string | null = null
  try {
    stats = await getCrossLeagueUserStats(session.user.id)
  } catch (e) {
    error = "Failed to load stats"
  }

  return (
    <div className="min-h-screen mode-surface mode-readable" data-testid="user-stats-page">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Link
          href="/profile"
          data-testid="user-stats-back-to-profile"
          className="text-sm font-medium mb-6 inline-block"
          style={{ color: "var(--muted)" }}
        >
          ← Profile
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "var(--text)" }}>
          Your stats
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
          Performance across all your leagues: wins, championships, playoff appearances, draft grades, and trade success.
        </p>
        <UserStatsClient initialStats={stats} error={error} />
      </div>
    </div>
  )
}
