'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  LayoutGrid,
  Users,
  ListOrdered,
  Sparkles,
  Share2,
  Copy,
  ChevronDown,
  ChevronRight,
  Check,
  FileText,
} from 'lucide-react'
import type { DraftSessionSnapshot, DraftPickSnapshot, SlotOrderEntry } from '@/lib/live-draft-engine/types'

export type PostDraftTab = 'summary' | 'teams' | 'roster' | 'replay' | 'recap' | 'share'

export type PostDraftViewProps = {
  leagueId: string
  leagueName: string
  sport: string
  session: DraftSessionSnapshot
  currentUserRosterId: string | null
  slotOrder: SlotOrderEntry[]
}

function buildSummaryText(
  session: DraftSessionSnapshot,
  slotOrder: SlotOrderEntry[],
  leagueName?: string
): string {
  const picks = session.picks ?? []
  const byPosition: Record<string, number> = {}
  for (const p of picks) {
    const pos = p.position || 'OTHER'
    byPosition[pos] = (byPosition[pos] ?? 0) + 1
  }
  const posLines = Object.entries(byPosition)
    .sort((a, b) => b[1] - a[1])
    .map(([pos, n]) => `${pos}: ${n}`)
    .join(', ')
  const teamLines = slotOrder.map((s) => {
    const teamPicks = picks.filter((p) => p.rosterId === s.rosterId)
    return `${s.displayName ?? `Team ${s.slot}`}: ${teamPicks.map((p) => p.playerName).join(', ')}`
  }).join('\n')
  return [
    `${leagueName ?? 'Draft'} — Draft complete`,
    `Rounds: ${session.rounds} · Teams: ${session.teamCount} · Total picks: ${picks.length}`,
    `By position: ${posLines}`,
    '',
    'Team rosters:',
    teamLines,
  ].join('\n')
}

export function PostDraftView({
  leagueId,
  leagueName,
  sport,
  session,
  currentUserRosterId,
  slotOrder,
}: PostDraftViewProps) {
  const [tab, setTab] = useState<PostDraftTab>('summary')
  const [recap, setRecap] = useState<string | null>(null)
  const [recapLoading, setRecapLoading] = useState(false)
  const [recapError, setRecapError] = useState<string | null>(null)
  const [copyLabel, setCopyLabel] = useState<'link' | 'summary' | null>(null)

  const picks = session.picks ?? []
  const totalPicks = session.rounds * session.teamCount
  const byPosition: Record<string, number> = {}
  for (const p of picks) {
    const pos = p.position || 'OTHER'
    byPosition[pos] = (byPosition[pos] ?? 0) + 1
  }

  const fetchRecap = useCallback(async () => {
    setRecapLoading(true)
    setRecapError(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/recap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && typeof data.recap === 'string') setRecap(data.recap)
      else setRecapError(data.error ?? 'Failed to load recap')
    } catch {
      setRecapError('Request failed')
    } finally {
      setRecapLoading(false)
    }
  }, [leagueId])

  const copyLink = useCallback(() => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    void navigator.clipboard?.writeText(url)?.then(() => {
      setCopyLabel('link')
      setTimeout(() => setCopyLabel(null), 2000)
    })
  }, [])

  const copySummary = useCallback(() => {
    const text = buildSummaryText(session, slotOrder, leagueName)
    void navigator.clipboard?.writeText(text)?.then(() => {
      setCopyLabel('summary')
      setTimeout(() => setCopyLabel(null), 2000)
    })
  }, [session, slotOrder, leagueName])

  const myPicks = currentUserRosterId
    ? picks.filter((p) => p.rosterId === currentUserRosterId)
    : []

  const tabs: { id: PostDraftTab; label: string; icon: typeof LayoutGrid }[] = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'roster', label: 'My Roster', icon: ListOrdered },
    { id: 'replay', label: 'Replay', icon: LayoutGrid },
    { id: 'recap', label: 'AI Recap', icon: Sparkles },
    { id: 'share', label: 'Share', icon: Share2 },
  ]

  return (
    <div className="flex h-full flex-col bg-[#0a0a0f] text-white">
      <header className="shrink-0 border-b border-white/12 bg-black/30 px-4 py-3">
        <h1 className="text-base font-semibold md:text-lg">{leagueName}</h1>
        <p className="text-xs text-white/60">{sport} · Draft complete</p>
      </header>

      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 bg-black/20 px-2 py-2 scrollbar-thin">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap touch-manipulation min-h-[44px] ${
              tab === id ? 'bg-cyan-500/20 text-cyan-200' : 'text-white/70 hover:bg-white/10'
            }`}
            aria-pressed={tab === id}
            aria-label={label}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-auto p-4 text-sm min-h-0">
        {tab === 'summary' && (
          <section className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">Draft summary</h2>
              <p className="text-white/90">Total picks: <strong>{picks.length}</strong> of {totalPicks}</p>
              <p className="text-white/90 mt-1">Rounds: <strong>{session.rounds}</strong> · Teams: <strong>{session.teamCount}</strong></p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">By position</h2>
              <ul className="space-y-1">
                {Object.entries(byPosition)
                  .sort((a, b) => b[1] - a[1])
                  .map(([pos, count]) => (
                    <li key={pos} className="flex justify-between text-white/90">
                      <span>{pos}</span>
                      <span className="tabular-nums">{count}</span>
                    </li>
                  ))}
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">Value / reach</h2>
              <p className="text-white/70 text-xs">
                Earliest pick by position (first time each position was selected):
              </p>
              <ul className="mt-2 space-y-1 text-sm text-white/90">
                {Object.entries(
                  picks.reduce<Record<string, number>>((acc, p) => {
                    const pos = p.position || 'OTHER'
                    if (acc[pos] == null || p.overall < acc[pos]) acc[pos] = p.overall
                    return acc
                  }, {})
                )
                  .sort((a, b) => a[1] - b[1])
                  .map(([pos, overall]) => (
                    <li key={pos}>{pos}: overall #{overall}</li>
                  ))}
              </ul>
              <p className="mt-2 text-[10px] text-white/50">Full value/reach vs ADP in Draft Grades.</p>
              <Link
                href={`/app/league/${leagueId}/draft-results`}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-cyan-600/20 px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-600/30"
              >
                View draft grades & rankings
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            {session.draftType === 'auction' && session.auction && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">Budget summary</h2>
                <p className="text-white/70 text-xs mb-2">Per-team budget and spent (auction).</p>
                <ul className="space-y-2">
                  {slotOrder.map((s) => {
                    const teamPicks = picks.filter((p) => p.rosterId === s.rosterId)
                    const spent = teamPicks.reduce((sum, p) => sum + (p.amount ?? 0), 0)
                    const budget = session.auction!.budgetPerTeam ?? 200
                    const remaining = Math.max(0, budget - spent)
                    return (
                      <li key={s.rosterId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-white/90">{s.displayName ?? `Team ${s.slot}`}</span>
                        <span className="text-white/70 tabular-nums">
                          ${spent} / ${budget} · ${remaining} left
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            {session.keeper?.selections && session.keeper.selections.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">Keeper outcome</h2>
                <p className="text-white/70 text-xs mb-2">Keepers locked and their round cost.</p>
                <ul className="space-y-1.5">
                  {session.keeper.selections.map((k, i) => {
                    const owner = slotOrder.find((s) => s.rosterId === k.rosterId)
                    return (
                      <li key={i} className="flex flex-wrap items-center gap-2 text-sm text-white/90">
                        <span className="font-medium">{k.playerName}</span>
                        <span className="text-white/50">{k.position}{k.team ? ` · ${k.team}` : ''}</span>
                        <span className="text-white/50">Round {k.roundCost}</span>
                        <span className="text-white/40 text-xs">({owner?.displayName ?? '—'})</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            {(session.devy?.enabled || session.c2c?.enabled) && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">Devy / C2C</h2>
                <ul className="space-y-1 text-sm text-white/80">
                  {session.devy?.enabled && session.devy.devyRounds?.length ? (
                    <li>Devy rounds: {session.devy.devyRounds.join(', ')}</li>
                  ) : null}
                  {session.c2c?.enabled && session.c2c.collegeRounds?.length ? (
                    <li>C2C college rounds: {session.c2c.collegeRounds.join(', ')}</li>
                  ) : null}
                </ul>
              </div>
            )}
          </section>
        )}

        {tab === 'teams' && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">Team-by-team results</h2>
            {slotOrder.map((s) => {
              const teamPicks = picks.filter((p) => p.rosterId === s.rosterId)
              return (
                <TeamResultsCard
                  key={s.rosterId}
                  displayName={s.displayName ?? `Team ${s.slot}`}
                  picks={teamPicks}
                />
              )
            })}
          </section>
        )}

        {tab === 'roster' && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">My drafted roster</h2>
            {myPicks.length === 0 ? (
              <p className="text-white/60">No picks for your team in this draft.</p>
            ) : (
              <ul className="space-y-2">
                {myPicks.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <span className="font-medium text-white/90">{p.playerName}</span>
                    <span className="text-xs text-white/50">{p.position}{p.team ? ` · ${p.team}` : ''}</span>
                    <span className="text-[10px] text-white/40">#{p.overall}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === 'replay' && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">Pick log (replay)</h2>
            <ol className="space-y-1.5">
              {picks.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left"
                >
                  <span className="tabular-nums text-white/50 w-8">#{p.overall}</span>
                  <span className="flex-1 font-medium text-white/90 truncate">{p.playerName}</span>
                  <span className="text-xs text-white/50 shrink-0">{p.position}</span>
                  <span className="text-xs text-white/40 max-w-[80px] truncate">{p.displayName ?? ''}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {tab === 'recap' && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">AI recap</h2>
            {!recap && !recapLoading && !recapError && (
              <button
                type="button"
                onClick={fetchRecap}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white hover:bg-cyan-500 min-h-[44px]"
              >
                <Sparkles className="h-4 w-4" />
                Generate AI recap
              </button>
            )}
            {recapLoading && <p className="text-white/60">Generating recap…</p>}
            {recapError && (
              <p className="text-amber-400 text-sm">{recapError}</p>
            )}
            {recap && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 whitespace-pre-wrap text-white/90">
                {recap}
              </div>
            )}
          </section>
        )}

        {tab === 'share' && (
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">Export & share</h2>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm text-white/90 hover:bg-white/10 min-h-[44px]"
              >
                {copyLabel === 'link' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copyLabel === 'link' ? 'Link copied' : 'Copy draft room link'}
              </button>
              <button
                type="button"
                onClick={copySummary}
                className="flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm text-white/90 hover:bg-white/10 min-h-[44px]"
              >
                {copyLabel === 'summary' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copyLabel === 'summary' ? 'Summary copied' : 'Copy summary (text)'}
              </button>
            </div>
            <p className="text-[11px] text-white/50">
              Share the link so others can view the draft. Summary copies a text version of rosters.
            </p>
          </section>
        )}
      </main>

      <div className="shrink-0 border-t border-white/10 px-4 py-3 flex flex-wrap items-center gap-4">
        <Link
          href={`/app/league/${leagueId}/draft-results`}
          className="inline-flex items-center gap-2 text-cyan-400 hover:underline text-sm"
        >
          Draft grades & rankings
        </Link>
        <Link
          href={`/app/league/${leagueId}`}
          className="inline-flex items-center gap-2 text-white/60 hover:underline text-sm"
        >
          Back to league
        </Link>
      </div>
    </div>
  )
}

function TeamResultsCard({
  displayName,
  picks,
}: {
  displayName: string
  picks: DraftPickSnapshot[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left min-h-[44px] touch-manipulation"
        aria-expanded={open}
      >
        <span className="font-medium text-white/90">{displayName}</span>
        <span className="text-xs text-white/50">{picks.length} picks</span>
        {open ? <ChevronDown className="h-4 w-4 text-white/50" /> : <ChevronRight className="h-4 w-4 text-white/50" />}
      </button>
      {open && (
        <ul className="border-t border-white/10 px-4 py-2 space-y-1">
          {picks.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span className="tabular-nums text-white/50 w-6">#{p.overall}</span>
              <span className="text-white/90">{p.playerName}</span>
              <span className="text-xs text-white/50">{p.position}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
