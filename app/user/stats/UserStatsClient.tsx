"use client"

import { Trophy, Target, MessageSquare, TrendingUp, Award, BarChart3 } from "lucide-react"
import type { CrossLeagueUserStatsResult } from "@/lib/user-stats"

export function UserStatsClient({
  initialStats,
  error,
}: {
  initialStats: CrossLeagueUserStatsResult | null
  error: string | null
}) {
  if (error) {
    return (
      <div
        className="rounded-xl border border-dashed p-8 text-center"
        style={{ borderColor: "var(--border)" }}
      >
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {error}
        </p>
      </div>
    )
  }

  const s = initialStats
  const hasAny =
    s &&
    (s.wins > 0 ||
      s.losses > 0 ||
      s.championships > 0 ||
      s.playoffAppearances > 0 ||
      s.draftGrades.count > 0 ||
      s.tradeSuccess.tradesSent > 0)

  if (!s || !hasAny) {
    return (
      <div
        className="rounded-xl border border-dashed p-8 text-center"
        style={{ borderColor: "var(--border)" }}
      >
        <BarChart3 className="h-12 w-12 mx-auto mb-3" style={{ color: "var(--muted)" }} />
        <p className="font-medium" style={{ color: "var(--text)" }}>
          No league stats yet
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Connect your leagues (e.g. Sleeper) and play seasons to see your wins, championships, draft grades, and more here.
        </p>
      </div>
    )
  }

  const winPct =
    s.wins + s.losses > 0 ? Math.round((s.wins / (s.wins + s.losses)) * 100) : 0
  const tradeRate =
    s.tradeSuccess.tradesSent > 0
      ? Math.round(s.tradeSuccess.acceptanceRate * 100)
      : null

  const cards = [
    {
      label: "Wins",
      value: String(s.wins),
      sub: s.losses > 0 ? `${winPct}% win rate` : null,
      icon: Trophy,
      testId: "user-stats-card-wins",
    },
    {
      label: "Losses",
      value: String(s.losses),
      sub: s.ties > 0 ? `${s.ties} ties` : null,
      icon: Target,
      testId: "user-stats-card-losses",
    },
    {
      label: "Championships",
      value: String(s.championships),
      sub: s.seasonsPlayed > 0 ? `Across ${s.seasonsPlayed} seasons` : null,
      icon: Award,
      testId: "user-stats-card-championships",
    },
    {
      label: "Playoff appearances",
      value: String(s.playoffAppearances),
      sub: s.leaguesPlayed > 0 ? `In ${s.leaguesPlayed} leagues` : null,
      icon: Trophy,
      testId: "user-stats-card-playoffs",
    },
    {
      label: "Draft grades",
      value:
        s.draftGrades.count > 0
          ? `${s.draftGrades.latestGrade ?? "—"} avg (${s.draftGrades.count})`
          : "—",
      sub:
        s.draftGrades.count > 0
          ? `Average score: ${Math.round(s.draftGrades.averageScore)}`
          : null,
      icon: TrendingUp,
      testId: "user-stats-card-draft-grades",
    },
    {
      label: "Trade success",
      value:
        s.tradeSuccess.tradesSent > 0
          ? `${s.tradeSuccess.tradesAccepted}/${s.tradeSuccess.tradesSent} accepted`
          : "—",
      sub: tradeRate != null ? `${tradeRate}% acceptance rate` : null,
      icon: MessageSquare,
      testId: "user-stats-card-trade-success",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ label, value, sub, icon: Icon, testId }) => (
          <div
            key={label}
            data-testid={testId}
            className="rounded-xl border p-4"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--panel) 60%, transparent)",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="rounded-lg p-2 shrink-0"
                style={{ background: "var(--panel2)" }}
              >
                <Icon className="h-5 w-5" style={{ color: "var(--muted)" }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                  {label}
                </p>
                <p className="text-xl font-semibold mt-0.5" style={{ color: "var(--text)" }}>
                  {value}
                </p>
                {sub && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                    {sub}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
