'use client'

/**
 * Portfolio Analytics — scoped to what's honestly derivable today.
 *
 * The mockup's "Season Performance Index" line chart and "Points For · last
 * 6 weeks" bar chart both need real historical weekly scoring aggregated
 * across every league a user plays — that aggregate doesn't exist yet
 * (`getDashboardLeagueListForUser` carries no per-week point history, and
 * there's no cross-league weekly rollup service to call instead). Rather
 * than fabricate those charts, this renders only "This Week's Best
 * Matchup" — real, via the same `buildMatchupCenterPayload` the League Hub
 * Matchup tab uses (`GET /api/leagues/[leagueId]/matchup-center`), picking
 * the single closest/highest-stakes live-or-upcoming matchup across the
 * user's own leagues for the current week — and discloses the gap rather
 * than hiding it.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { UserLeague } from '@/app/dashboard/types'
import { FeatureGate } from '@/components/subscription/FeatureGate'
import styles from './universal-dashboard.module.css'

type BoardLeague = UserLeague & { navigationLeagueId?: string | null }

type MatchupSide = { teamName: string; totalPoints: number; projectedTotal: number }
type MatchupPayload = {
  leagueId: string
  matchupStatus: 'upcoming' | 'live' | 'final'
  left: MatchupSide
  right: MatchupSide
  winProbabilityLeft: number | null
}

export function PortfolioAnalytics({ leagues }: { leagues: BoardLeague[] }) {
  const [best, setBest] = useState<{ leagueName: string; leagueId: string; navId: string; payload: MatchupPayload } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const candidates = leagues.filter((l) => String(l.status ?? '').toLowerCase().includes('season') || l.status === 'playoffs')
    if (candidates.length === 0) {
      setLoading(false)
      return
    }
    Promise.all(
      candidates.slice(0, 12).map((l) =>
        fetch(`/api/leagues/${encodeURIComponent(l.navigationLeagueId ?? l.id)}/matchup-center`, {
          cache: 'no-store',
          credentials: 'include',
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((payload: MatchupPayload | null) => (payload ? { league: l, payload } : null))
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return
      const live = results.filter((r): r is NonNullable<typeof r> => r !== null && (r.payload.matchupStatus === 'live' || r.payload.matchupStatus === 'upcoming'))
      // "Best" = closest real contest — smallest |winProbabilityLeft - 50|, live matchups first.
      live.sort((a, b) => {
        if (a.payload.matchupStatus !== b.payload.matchupStatus) return a.payload.matchupStatus === 'live' ? -1 : 1
        const distA = a.payload.winProbabilityLeft != null ? Math.abs(a.payload.winProbabilityLeft - 50) : 999
        const distB = b.payload.winProbabilityLeft != null ? Math.abs(b.payload.winProbabilityLeft - 50) : 999
        return distA - distB
      })
      const top = live[0]
      if (top) {
        setBest({
          leagueName: top.league.name || 'Untitled league',
          leagueId: top.league.id,
          navId: top.league.navigationLeagueId ?? top.league.id,
          payload: top.payload,
        })
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [leagues])

  return (
    <>
      <div className={styles.sectionHead}>
        <div className={styles.sectionHeadLeft}>
          <h2>Portfolio Analytics</h2>
        </div>
      </div>
      <div className={styles.analytics}>
        <div className={styles.chartCard}>
          <h3>Season Performance Index</h3>
          <p className={styles.sub}>
            Trend charts across every league on one normalized scale need weekly scoring history aggregated
            per-league — that cross-league rollup isn&apos;t built yet, so this is deliberately not shown with
            placeholder data. Real per-league scoring trends are available today on each league&apos;s own
            Matchups tab.
          </p>
        </div>
        <div className={styles.miniStack}>
          <div className={styles.mini}>
            <div className={styles.mh}>This Week&apos;s Best Matchup</div>
            <FeatureGate featureId="matchup_explanations" featureNameOverride="Matchup win-probability analysis">
              {loading ? (
                <p className={styles.sub} style={{ marginTop: 8 }}>
                  Checking your leagues…
                </p>
              ) : best ? (
                <Link href={`/league/${encodeURIComponent(best.navId)}?tab=matchups`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className={styles.wpRow}>
                    <span>{Math.round(best.payload.winProbabilityLeft ?? 50)}%</span>
                    <span>{100 - Math.round(best.payload.winProbabilityLeft ?? 50)}%</span>
                  </div>
                  <div className={styles.wpBar}>
                    <span className={styles.wpWin} style={{ width: `${best.payload.winProbabilityLeft ?? 50}%` }} />
                    <span className={styles.wpLose} style={{ width: `${100 - (best.payload.winProbabilityLeft ?? 50)}%` }} />
                  </div>
                  <div className={styles.wpTeams}>
                    <span>
                      {best.payload.left.teamName} · {best.payload.left.totalPoints.toFixed(1)} pts
                    </span>
                    <span>
                      {best.payload.right.teamName} · {best.payload.right.totalPoints.toFixed(1)} pts
                    </span>
                  </div>
                  <div className={styles.sub} style={{ marginTop: 8 }}>
                    {best.leagueName}
                  </div>
                </Link>
              ) : (
                <p className={styles.sub} style={{ marginTop: 8 }}>
                  No live or upcoming matchups this week yet.
                </p>
              )}
            </FeatureGate>
          </div>
        </div>
      </div>
    </>
  )
}
