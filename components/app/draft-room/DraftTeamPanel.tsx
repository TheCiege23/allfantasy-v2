'use client'

import { Bot, User, TrendingUp } from 'lucide-react'
import type { SlotOrderEntry } from '@/lib/live-draft-engine/types'

export type DraftTeamPanelProps = {
  leagueName: string
  sport: string
  slotOrder: SlotOrderEntry[]
  currentUserRosterId: string | null
  /** Picks for the focused team (usually current user) */
  draftedPicks: Array<{ playerName: string; position: string; overall: number; rosterId: string }>
  teamCount: number
  rounds: number
  /** Total picks recorded in the draft session (all teams) */
  leaguePicksMade: number
  commissionerAiTeams?: Array<{ teamId: string; teamName: string; aiStyle: string; tradeAggression: string; active: boolean }>
  /** When user selects another team to inspect — defaults to current user */
  focusRosterId?: string | null
}

function posCounts(picks: Array<{ position: string }>): Record<string, number> {
  const m: Record<string, number> = {}
  for (const p of picks) {
    const k = String(p.position || '—').toUpperCase()
    m[k] = (m[k] ?? 0) + 1
  }
  return m
}

export function DraftTeamPanel({
  leagueName,
  sport,
  slotOrder,
  currentUserRosterId,
  draftedPicks,
  teamCount,
  rounds,
  leaguePicksMade,
  commissionerAiTeams = [],
  focusRosterId,
}: DraftTeamPanelProps) {
  const focus = focusRosterId ?? currentUserRosterId
  const slot = slotOrder.find((s) => s.rosterId === focus)
  const myPicks = focus ? draftedPicks.filter((p) => p.rosterId === focus) : []
  const aiAssignment = commissionerAiTeams.find((t) => t.teamId === focus && t.active)
  const counts = posCounts(myPicks)
  const topNeed = Object.entries(counts).sort((a, b) => a[1] - b[1])[0]?.[0] ?? '—'
  const totalPicks = rounds * teamCount
  const picksRemaining = Math.max(0, totalPicks - leaguePicksMade)

  return (
    <aside
      className="flex h-full min-h-0 flex-col border border-white/8 bg-gradient-to-b from-[#070f21] to-[#040915] md:border-0"
      data-testid="draft-team-panel"
    >
      <div className="border-b border-white/8 px-3 py-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-cyan-200/80">Your war room</p>
        <h2 className="truncate text-sm font-semibold text-white">{slot?.displayName ?? 'Team'}</h2>
        <p className="truncate text-[10px] text-white/45">{leagueName}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[9px] text-white/60">{sport}</span>
          {slot && (
            <span className="rounded border border-cyan-400/25 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] text-cyan-100">
              Slot {slot.slot}
            </span>
          )}
          {aiAssignment ? (
            <span className="inline-flex items-center gap-0.5 rounded border border-sky-400/35 bg-sky-500/15 px-1.5 py-0.5 text-[9px] text-sky-100">
              <Bot className="h-3 w-3" aria-hidden />
              AI · {aiAssignment.aiStyle.replace(/_/g, ' ')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 rounded border border-white/15 px-1.5 py-0.5 text-[9px] text-white/70">
              <User className="h-3 w-3" aria-hidden />
              Human
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 border-b border-white/8 px-3 py-2">
        <p className="text-[9px] font-medium uppercase tracking-wider text-white/40">Positional mix</p>
        <div className="flex flex-wrap gap-1">
          {Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([pos, n]) => (
              <span
                key={pos}
                className="rounded border border-white/10 bg-black/25 px-1.5 py-0.5 text-[9px] text-white/75"
              >
                {pos} ×{n}
              </span>
            ))}
          {myPicks.length === 0 && <span className="text-[10px] text-white/35">No picks yet</span>}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/55">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-300/90" aria-hidden />
          <span>
            Light need: <span className="text-white/80">{topNeed}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-2">
        <p className="text-[9px] font-medium uppercase tracking-wider text-white/40">Drafted ({myPicks.length})</p>
        <ul className="space-y-1">
          {myPicks.length === 0 ? (
            <li className="text-[10px] text-white/35">Waiting for first pick…</li>
          ) : (
            myPicks
              .slice()
              .sort((a, b) => a.overall - b.overall)
              .map((p) => (
                <li
                  key={`${p.overall}-${p.playerName}`}
                  className="flex items-center justify-between gap-2 rounded border border-white/8 bg-black/20 px-2 py-1 text-[10px]"
                >
                  <span className="truncate font-medium text-white/90">{p.playerName}</span>
                  <span className="shrink-0 text-white/45">
                    {p.position} · #{p.overall}
                  </span>
                </li>
              ))
          )}
        </ul>
        <div className="mt-auto rounded border border-white/8 bg-black/25 px-2 py-1.5 text-[9px] text-white/50">
          <div className="flex justify-between">
            <span>League picks left</span>
            <span className="tabular-nums text-cyan-200/90">{picksRemaining}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
