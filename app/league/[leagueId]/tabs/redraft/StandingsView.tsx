'use client'

export function StandingsView({
  rows,
}: {
  rows: { id: string; teamName: string | null; wins: number; losses: number; pointsFor: number }[]
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
      <table className="w-full text-left text-[12px] text-white/80">
        <thead className="border-b border-white/[0.08] bg-white/[0.04] text-[10px] uppercase text-white/45">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Team</th>
            <th className="px-3 py-2">W-L</th>
            <th className="px-3 py-2">PF</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-b border-white/[0.05]">
              <td className="px-3 py-2 text-white/45">{i + 1}</td>
              <td className="px-3 py-2">{r.teamName ?? r.id.slice(0, 6)}</td>
              <td className="px-3 py-2">
                {r.wins}-{r.losses}
              </td>
              <td className="px-3 py-2">{r.pointsFor.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
