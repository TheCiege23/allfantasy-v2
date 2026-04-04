'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useSleeperPlayers } from '@/lib/hooks/useSleeperPlayers'
import { DefenderRoleCard } from '@/app/idp/components/defense/DefenderRoleCard'
import { SnapShareTracker } from '@/app/idp/components/defense/SnapShareTracker'
import { MatchupDifficultyBoard } from '@/app/idp/components/defense/MatchupDifficultyBoard'
import { mockIdpPoints } from '@/app/idp/components/idpPositionUtils'

type Tab = 'ALL' | 'DL' | 'LB' | 'DB' | 'IDP FLEX'

const MOCK_IDS = ['def1', 'def2', 'def3']

export function DefenseHubClient({ leagueId }: { leagueId: string }) {
  const [tab, setTab] = useState<Tab>('ALL')
  const [sort, setSort] = useState<'eff' | 'pts'>('eff')
  const { players } = useSleeperPlayers('nfl')

  const rows = useMemo(() => {
    return MOCK_IDS.map((id, i) => {
      const pts = mockIdpPoints(id, 1).pts
      const sal = 4 + i * 2.5
      const eff = pts / sal
      return { id, name: `Defender ${i + 1}`, team: 'NFL', pos: 'LB', pts, sal, eff }
    }).sort((a, b) => (sort === 'eff' ? b.eff - a.eff : b.pts - a.pts))
  }, [sort])

  const snapRows = MOCK_IDS.map((id, i) => ({
    playerId: id,
    name: `Defender ${i + 1}`,
    last: 60 + i,
    thisWeek: 62 + i,
    trend: (i % 3 === 0 ? 'up' : i % 3 === 1 ? 'down' : 'flat') as 'up' | 'down' | 'flat',
  }))

  const matchRows = MOCK_IDS.map((id, i) => ({
    playerId: id,
    name: `Defender ${i + 1}`,
    opponent: `@OPP${i}`,
    grade: (i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'avg' : 'tough') as 'easy' | 'avg' | 'tough',
    note: i % 2 === 0 ? 'LB vs run-heavy team' : 'CB vs top WR',
  }))

  return (
    <div className="min-h-screen bg-[#040915] px-4 py-6 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-2">
          <Link href={`/league/${leagueId}`} className="text-[12px] text-cyan-300/90 hover:underline">
            ← League
          </Link>
          <h1 className="text-lg font-bold">Defense Hub</h1>
        </div>

        <div className="flex flex-wrap gap-1">
          {(['ALL', 'DL', 'LB', 'DB', 'IDP FLEX'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ${
                tab === t ? 'bg-red-500/20 text-red-100' : 'text-white/45 hover:bg-white/[0.04]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-white/45">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as 'eff' | 'pts')}
            className="rounded-md border border-white/15 bg-black/40 px-2 py-1 text-[11px] text-white"
          >
            <option value="eff">Cap efficiency</option>
            <option value="pts">IDP points</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="w-full min-w-[720px] text-left text-[11px]">
            <thead className="border-b border-white/[0.06] bg-black/30 text-[10px] uppercase text-white/45">
              <tr>
                <th className="px-2 py-2">Rank</th>
                <th className="px-2 py-2">Player</th>
                <th className="px-2 py-2">Team</th>
                <th className="px-2 py-2">Role</th>
                <th className="px-2 py-2">Pts</th>
                <th className="px-2 py-2">Avg</th>
                <th className="px-2 py-2">$M</th>
                <th className="px-2 py-2">Pts/$M</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const q = r.eff > 2 ? 'text-[color:var(--cap-green)]' : r.eff > 1 ? 'text-[color:var(--cap-amber)]' : 'text-[color:var(--cap-red)]'
                return (
                  <tr key={r.id} className="border-t border-white/[0.04]">
                    <td className="px-2 py-2 text-white/45">{idx + 1}</td>
                    <td className="px-2 py-2 font-medium">{r.name}</td>
                    <td className="px-2 py-2 text-white/50">{r.team}</td>
                    <td className="px-2 py-2 text-white/45">IDP</td>
                    <td className="px-2 py-2">{r.pts.toFixed(1)}</td>
                    <td className="px-2 py-2">{(r.pts * 0.95).toFixed(1)}</td>
                    <td className="px-2 py-2">${r.sal.toFixed(1)}</td>
                    <td className={`px-2 py-2 font-semibold ${q}`}>{r.eff.toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {MOCK_IDS.map((id, i) => (
            <DefenderRoleCard
              key={id}
              playerId={id}
              name={`Defender ${i + 1}`}
              position="LB"
              sport="nfl"
              players={players}
              salaryM={4 + i * 2}
              years={2}
              capEff={1.2 + i * 0.3}
              snapsPct={55 + i * 5}
            />
          ))}
        </div>

        <SnapShareTracker rows={snapRows} />
        <MatchupDifficultyBoard rows={matchRows} />
      </div>
    </div>
  )
}
