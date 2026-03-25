import Link from 'next/link'
import { resolveBracketChallengeLabel, resolveBracketSportUI } from '@/lib/bracket-challenge'

type PoolItem = {
  id: string
  name: string
  members: number
  entries: number
  sport: string
  challengeType?: string | null
  bracketType?: string | null
}

export default function MyPoolsTab({ pools }: { pools: PoolItem[] }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">My Pools</h3>
        <Link href="/brackets" className="text-xs text-cyan-300 hover:underline">View all</Link>
      </div>
      {pools.length === 0 ? (
        <p className="text-sm text-white/60">No pools yet. Create one to get started.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full text-left text-xs text-white/80">
            <thead className="bg-white/5 text-white/55">
              <tr>
                <th className="px-3 py-2 font-medium">Pool</th>
                <th className="px-3 py-2 font-medium">Members</th>
                <th className="px-3 py-2 font-medium">Entries</th>
              </tr>
            </thead>
            <tbody>
              {pools.slice(0, 6).map((p) => {
                const sportUI = resolveBracketSportUI(p.sport)
                const challengeLabel = resolveBracketChallengeLabel({
                  sport: p.sport,
                  challengeType: p.challengeType,
                  bracketType: p.bracketType,
                })
                return (
                  <tr key={p.id} className="border-t border-white/10">
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        <Link href={`/brackets/leagues/${p.id}`} className="hover:underline">
                          {p.name}
                        </Link>
                        <div className="inline-flex items-center gap-1 text-[10px] text-white/60">
                          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-1.5 py-0.5 text-cyan-200/90">
                            <span className="font-semibold">{sportUI.badge}</span>
                            <span>{sportUI.shortLabel}</span>
                          </span>
                          <span>{challengeLabel}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">{p.members}</td>
                    <td className="px-3 py-2">{p.entries}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
