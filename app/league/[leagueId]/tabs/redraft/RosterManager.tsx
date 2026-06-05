'use client'

import type { RedraftRosterClient } from '@/lib/redraft/client'

function slotRank(slot: string): number {
  const normalized = slot.toLowerCase()
  if (normalized === 'bench') return 50
  if (normalized === 'taxi') return 60
  if (normalized === 'ir') return 70
  return 10
}

export function RosterManager({
  roster,
  week,
}: {
  roster: RedraftRosterClient | null
  week: number
}) {
  const players = [...(roster?.players ?? [])].sort((a, b) => {
    const slotDiff = slotRank(a.slotType) - slotRank(b.slotType)
    if (slotDiff !== 0) return slotDiff
    return a.playerName.localeCompare(b.playerName)
  })
  const scored = players.filter((p) => p.weeklyScore).length

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-bold text-white">Roster</h3>
          <p className="text-[11px] text-white/45">
            {roster ? `${roster.teamName ?? roster.ownerName ?? 'Roster'} - Week ${week}` : 'Select a roster to view players.'}
          </p>
        </div>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] font-semibold text-cyan-100">
          {scored}/{players.length} scored
        </span>
      </div>

      {!roster ? (
        <div className="rounded-lg border border-white/[0.06] bg-black/20 p-4 text-[12px] text-white/45">
          No roster loaded yet.
        </div>
      ) : players.length === 0 ? (
        <div className="rounded-lg border border-amber-300/20 bg-amber-400/10 p-4 text-[12px] text-amber-100">
          This roster has no active players yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] text-white/80">
            <thead className="border-b border-white/[0.08] text-[10px] uppercase text-white/40">
              <tr>
                <th className="py-2 pr-2">Slot</th>
                <th className="py-2 pr-2">Player</th>
                <th className="py-2 pr-2">Team</th>
                <th className="py-2 text-right">Pts</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id} className="border-b border-white/[0.05]">
                  <td className="py-2 pr-2">
                    <span className="rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 text-[10px] text-white/60">
                      {player.slotType}
                    </span>
                  </td>
                  <td className="min-w-0 py-2 pr-2">
                    <div className="font-semibold text-white/85">{player.playerName}</div>
                    <div className="text-[10px] text-white/35">
                      {player.position}
                      {player.injuryStatus ? ` - ${player.injuryStatus}` : ''}
                    </div>
                  </td>
                  <td className="py-2 pr-2 text-white/50">{player.team ?? 'FA'}</td>
                  <td className="py-2 text-right font-bold text-white">
                    {player.weeklyScore ? player.weeklyScore.fantasyPts.toFixed(2) : 'Missing'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
