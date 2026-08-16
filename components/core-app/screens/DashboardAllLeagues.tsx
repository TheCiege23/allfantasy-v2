'use client'

import Link from 'next/link'
import '@/components/core-app/af-dashboard.css'
import type { CoreIssue, IssueDetector } from '@/lib/core-app/outstandingIssues'

/**
 * Screen 1 — Dashboard, all leagues.
 *
 * The handoff orders the main column by urgency: the top outstanding issues
 * across every league, then career and portfolio summaries. No season timeline
 * until a league is picked — that belongs to screen 2.
 *
 * Every action opens the platform. There is no button here that writes anywhere,
 * because AllFantasy is read-only on every connected platform, and a button
 * labelled "Set lineup" would be a lie about what the product does.
 */

export type DashboardAllLeaguesProps = {
  issues: CoreIssue[]
  detectorsUnavailable: Array<{ detector: IssueDetector; reason: string }>
  leagueCount: number
  now: string
}

function countdown(deadline: Date | null, now: Date): { label: string; urgent: boolean } | null {
  if (!deadline) return null
  const ms = deadline.getTime() - now.getTime()
  if (ms <= 0) return { label: 'now', urgent: true }
  const mins = Math.floor(ms / 60_000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  // The handoff turns anything inside an hour --bad.
  const urgent = ms <= 3_600_000
  if (days >= 1) return { label: `${days}d`, urgent }
  if (hours >= 1) return { label: `${hours}h ${String(mins % 60).padStart(2, '0')}m`, urgent }
  return { label: `${mins}m`, urgent }
}

function IssueRow({ issue, now }: { issue: CoreIssue; now: Date }) {
  const cd = countdown(issue.deadline, now)
  return (
    <li className="af-issue af-issue-row" data-severity={issue.severity}>
      <span className="af-issue-glyph" data-severity={issue.severity} aria-hidden>
        {issue.glyph}
      </span>

      <div className="af-issue-text">
        <div className="af-issue-title">{issue.title}</div>
        <div className="af-issue-meta">
          {issue.meta}
          {cd ? (
            <>
              {' · '}
              <span className="af-deadline af-num" data-urgent={cd.urgent}>
                {cd.label}
              </span>
            </>
          ) : null}
        </div>
      </div>

      {issue.action ? (
        <Link
          href={issue.action.href}
          className="af-btn af-issue-action"
          {...(issue.action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {issue.action.label}
        </Link>
      ) : null}
    </li>
  )
}

export function DashboardAllLeagues({
  issues,
  detectorsUnavailable,
  leagueCount,
  now,
}: DashboardAllLeaguesProps) {
  const nowDate = new Date(now)

  return (
    <div className="af-dash">
      <section className="af-frame af-dash-issues">
        <header className="af-dash-head">
          <h1 className="af-display af-dash-title">Outstanding issues</h1>
          <span className="af-chip af-num">{issues.length} open</span>
          <span className="af-dash-sort af-label">Soonest deadline first</span>
        </header>

        {issues.length > 0 ? (
          <ul className="af-issue-list">
            {issues.map((i) => (
              <IssueRow key={i.id} issue={i} now={nowDate} />
            ))}
          </ul>
        ) : (
          <div className="af-empty">
            <div className="af-empty-title">
              {leagueCount === 0 ? 'No leagues connected yet' : 'Nothing needs you right now'}
            </div>
            <p className="af-empty-body">
              {leagueCount === 0
                ? 'Connect Sleeper, ESPN or Yahoo and your leagues will appear here. Read-only, about a minute.'
                : `Across ${leagueCount} ${leagueCount === 1 ? 'league' : 'leagues'}, nothing we can currently detect is waiting on a decision.`}
            </p>
            {leagueCount === 0 ? (
              <Link href="/import" className="af-btn">
                Connect a platform
              </Link>
            ) : null}
          </div>
        )}

        {/*
          Saying what is NOT being watched.

          An issues feed that shows "0 open" reads as "everything is fine", which
          is only true if every category is actually being checked. Most are not
          yet — so the screen states which, rather than letting an empty list
          imply an all-clear it has not earned.
        */}
        {detectorsUnavailable.length > 0 ? (
          <details className="af-coverage">
            <summary className="af-coverage-summary">
              Not yet watched: {detectorsUnavailable.length} issue types
            </summary>
            <ul className="af-coverage-list">
              {detectorsUnavailable.map((d) => (
                <li key={d.detector}>
                  <code>{d.detector.replace(/_/g, ' ')}</code>
                  <span className="af-coverage-reason">{d.reason}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>
    </div>
  )
}

export default DashboardAllLeagues
