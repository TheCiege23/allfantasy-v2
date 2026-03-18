'use client'

/**
 * PROMPT 4: Team Roster View — tabs: Active Pro Roster, Taxi, Devy Rights, Future Picks.
 * Badges: NCAA, DECLARED, DRAFTED, PROMOTION ELIGIBLE, PROMOTED, RETURNING.
 */

import { useState } from 'react'

export type DevyRosterTab = 'active' | 'taxi' | 'devy' | 'picks'

const BADGE_STYLES: Record<string, string> = {
  NCAA: 'bg-violet-500/30 text-violet-200 border border-violet-500/50',
  DECLARED: 'bg-amber-500/30 text-amber-200 border border-amber-500/50',
  DRAFTED: 'bg-blue-500/30 text-blue-200 border border-blue-500/50',
  PROMOTION_ELIGIBLE: 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/50',
  PROMOTED: 'bg-emerald-600/40 text-white border border-emerald-400/60',
  RETURNING: 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/50',
}

function Badge({ label }: { label: string }) {
  const style = BADGE_STYLES[label] ?? 'bg-white/10 text-white/80 border border-white/20'
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  )
}

export interface DevyRosterItem {
  id: string
  name: string
  position?: string
  school?: string
  tab: DevyRosterTab
  badge?: string
  draftEligibleYear?: number
}

interface DevyTeamRosterViewProps {
  leagueId: string
  sport: 'NFL' | 'NBA'
  activePro: DevyRosterItem[]
  taxi: DevyRosterItem[]
  devyRights: DevyRosterItem[]
  futurePicks: Array<{ year: number; round: number; originalOwner?: string }>
}

export function DevyTeamRosterView({
  leagueId,
  sport,
  activePro,
  taxi,
  devyRights,
  futurePicks,
}: DevyTeamRosterViewProps) {
  const [tab, setTab] = useState<DevyRosterTab>('active')
  const sportLabel = sport === 'NFL' ? 'NCAA Football' : 'NCAA Basketball'

  const tabs: { id: DevyRosterTab; label: string }[] = [
    { id: 'active', label: 'Active Pro Roster' },
    { id: 'taxi', label: 'Taxi' },
    { id: 'devy', label: 'Devy Rights' },
    { id: 'picks', label: 'Future Picks' },
  ]

  const list = tab === 'active' ? activePro : tab === 'taxi' ? taxi : tab === 'devy' ? devyRights : []
  const showPicks = tab === 'picks'

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-base font-semibold text-white">Team Roster</h3>
      <div className="flex gap-2 border-b border-white/10 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-white/15 text-white'
                : 'text-white/60 hover:bg-white/10 hover:text-white/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!showPicks && (
        <p className="text-xs text-white/50">
          {sport} · {tab === 'devy' ? sportLabel : 'Pro'}
        </p>
      )}

      {showPicks && (
        <ul className="space-y-2">
          {futurePicks.length === 0 ? (
            <li className="text-sm text-white/50">No future picks</li>
          ) : (
            futurePicks.map((p, i) => (
              <li key={`${p.year}-${p.round}-${i}`} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm text-white/90">
                <span>{p.year} Round {p.round}</span>
                {p.originalOwner && <span className="text-white/50">via {p.originalOwner}</span>}
              </li>
            ))
          )}
        </ul>
      )}

      {!showPicks && list.length === 0 && (
        <p className="text-sm text-white/50">No players in this section</p>
      )}

      {!showPicks && list.length > 0 && (
        <ul className="space-y-2">
          {list.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-white">{item.name}</span>
                {item.position && <span className="text-xs text-white/50">{item.position}</span>}
                {item.school && <span className="text-xs text-white/50">{item.school}</span>}
                {item.badge && <Badge label={item.badge} />}
              </div>
              {item.draftEligibleYear && (
                <span className="text-xs text-white/50">Eligible {item.draftEligibleYear}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
