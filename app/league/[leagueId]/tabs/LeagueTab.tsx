'use client'

import { useMemo } from 'react'
import { ManagerRoleBadge } from '@/components/ManagerRoleBadge'
import type { LeagueTeamSlot, UserLeague } from '@/app/dashboard/types'

export type LeagueTabProps = {
  league: UserLeague
  teams: LeagueTeamSlot[]
}

function teamAvatarSrc(avatarUrl: string | null): string | null {
  if (!avatarUrl?.trim()) return null
  const t = avatarUrl.trim()
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  return `https://sleepercdn.com/avatars/${t}`
}

function teamInitials(team: LeagueTeamSlot): string {
  const raw = team.teamName.trim() || team.ownerName.trim() || '?'
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  }
  return raw.slice(0, 2).toUpperCase()
}

function isPreDraftLeague(league: UserLeague): boolean {
  const s = String(league.status ?? '').toLowerCase()
  if (!s) return true
  if (s.includes('in_season') || s === 'in season' || s === 'complete' || s === 'postseason') {
    return false
  }
  return s.includes('draft') || s.includes('pre') || s === 'scheduled'
}

function sortTeamsForStandings(teams: LeagueTeamSlot[], preDraft: boolean): LeagueTeamSlot[] {
  const copy = [...teams]
  if (preDraft) {
    return copy.sort((a, b) => {
      const ap = a.draftPosition
      const bp = b.draftPosition
      if (ap != null && bp != null) return ap - bp
      if (ap != null) return -1
      if (bp != null) return 1
      return a.teamName.localeCompare(b.teamName, undefined, { sensitivity: 'base' })
    })
  }
  return copy.sort((a, b) => {
    const w = b.wins - a.wins
    if (w !== 0) return w
    const t = b.ties - a.ties
    if (t !== 0) return t
    return b.pointsFor - a.pointsFor
  })
}

type ScoringFlavor = 'ppr' | 'half' | 'standard'

function scoringFlavorFromLeague(scoring: string): ScoringFlavor {
  const s = scoring.toLowerCase()
  if (s.includes('half')) return 'half'
  if (s.includes('ppr')) return 'ppr'
  return 'standard'
}

function receptionRowHighlight(flavor: ScoringFlavor): boolean {
  return flavor !== 'ppr'
}

function receptionPointsLabel(flavor: ScoringFlavor): string {
  if (flavor === 'ppr') return '1 pt per reception'
  if (flavor === 'half') return '0.5 pts per reception'
  return '0 pts per reception'
}

type ScoringRowProps = { label: string; value: string; highlight?: boolean }

function ScoringRow({ label, value, highlight }: ScoringRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-b border-white/[0.05] px-4 py-2 last:border-b-0 ${
        highlight ? 'border-l-2 border-l-amber-500 bg-amber-500/10' : ''
      }`}
    >
      <span className="text-[12px] text-white/50">{label}</span>
      <span className="text-right text-[12px] text-white/80">{value}</span>
    </div>
  )
}

export function LeagueTab({ league, teams }: LeagueTabProps) {
  const preDraft = isPreDraftLeague(league)
  const sorted = useMemo(() => sortTeamsForStandings(teams, preDraft), [teams, preDraft])
  const flavor = scoringFlavorFromLeague(league.scoring ?? 'Standard')
  const recHighlight = receptionRowHighlight(flavor)

  return (
    <div className="space-y-4 p-5">
      <section
        className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0c1e]"
        aria-label="Members and standings"
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
          <h2 className="text-[14px] font-bold text-white">Members</h2>
          <span className="text-[11px] text-white/40">
            {teams.length} team{teams.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.06] text-[9px] uppercase tracking-wide text-white/35">
                <th className="w-8 px-2 py-2 text-center font-medium">#</th>
                <th className="px-2 py-2 font-medium">Team</th>
                {!preDraft ? (
                  <>
                    <th className="whitespace-nowrap px-2 py-2 text-right font-medium">W-L</th>
                    <th className="whitespace-nowrap px-2 py-2 text-right font-medium">PF</th>
                    <th className="whitespace-nowrap px-2 py-2 text-right font-medium">PA</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {sorted.map((team, index) => {
                const rank = index + 1
                const src = teamAvatarSrc(team.avatarUrl)
                const wl = `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''}`
                const hasRecord = team.wins > 0 || team.losses > 0 || team.ties > 0
                return (
                  <tr key={team.id} className="border-b border-white/[0.05] last:border-b-0">
                    <td className="w-8 px-2 py-2.5 text-center text-[13px] text-white/25">{rank}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white/10">
                          {src ? (
                            <img src={src} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-[9px] font-bold text-white/70">
                              {teamInitials(team)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-semibold text-white">{team.teamName}</span>
                            <ManagerRoleBadge role={team.role} />
                          </div>
                          <p className="text-[10px] text-white/35">
                            @{team.ownerName.replace(/^@/, '') || 'manager'}
                          </p>
                        </div>
                      </div>
                    </td>
                    {!preDraft ? (
                      <>
                        <td className="whitespace-nowrap px-2 py-2.5 text-right text-[10px] text-white/40">
                          {hasRecord ? wl : '—-—'}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-right text-[10px] text-white/40">
                          {team.pointsFor > 0 ? team.pointsFor.toFixed(1) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-right text-[10px] text-white/40">
                          —
                        </td>
                      </>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0c1e]"
        aria-label="League settings"
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
          <h2 className="text-[14px] font-bold text-white">League Settings</h2>
          <span className="text-lg text-white/50" aria-hidden>
            ⚙️
          </span>
        </div>
        <div className="divide-y divide-white/[0.05]">
          {[
            { label: 'Number of Teams', value: String(league.teamCount) },
            { label: 'Roster Format', value: league.scoring },
            { label: 'Playoffs', value: '8 teams, starts week 15' },
            { label: 'Waiver Type', value: 'FAAB (Bidding)' },
            { label: 'Trade Deadline', value: 'Week 11' },
            { label: 'IR Slots', value: '1' },
            { label: 'Draft Pick Trading', value: 'Yes' },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-[12px] text-white/55">{row.label}</span>
              <span className="text-right text-[12px] text-white/85">{row.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section
        className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0c1e]"
        aria-label="Scoring settings"
      >
        <div className="border-b border-white/[0.07] px-4 py-3">
          <h2 className="text-[14px] font-bold text-white">Scoring</h2>
          <p className="mt-0.5 text-[10px] text-white/40">(Non-standard settings highlighted)</p>
        </div>

        <div className="px-0 pb-1">
          <p className="px-4 pt-3 text-[10px] font-bold uppercase tracking-wider text-white/45">
            Passing
          </p>
          <ScoringRow label="Passing TDs" value="4 pts" />
          <ScoringRow label="Pass YDS" value="0.04/yd (25 yds = 1 pt)" />
          <ScoringRow label="Interceptions thrown" value="-1 pt" />
        </div>

        <div className="px-0 pb-1">
          <p className="px-4 pt-3 text-[10px] font-bold uppercase tracking-wider text-white/45">
            Rushing
          </p>
          <ScoringRow label="Rush YDS" value="0.1/yd (10 yds = 1 pt)" />
          <ScoringRow label="Rushing TDs" value="6 pts" />
        </div>

        <div className="px-0 pb-2">
          <p className="px-4 pt-3 text-[10px] font-bold uppercase tracking-wider text-white/45">
            Receiving
          </p>
          <ScoringRow
            label="Receptions"
            value={receptionPointsLabel(flavor)}
            highlight={recHighlight}
          />
          <ScoringRow label="Rec YDS" value="0.1/yd (10 yds = 1 pt)" />
          <ScoringRow label="Receiving TDs" value="6 pts" />
        </div>
      </section>
    </div>
  )
}
