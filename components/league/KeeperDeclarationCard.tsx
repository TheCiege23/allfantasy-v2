import type { LeagueKeeperDeclarationItem } from '@/components/league/types'

export default function KeeperDeclarationCard({
  items,
}: {
  items: LeagueKeeperDeclarationItem[]
}) {
  return (
    <section className="rounded-2xl border border-[#1E2A42] bg-[#131929] p-4">
      <div className="mb-3 text-[18px] font-semibold text-white">Keeper Declarations</div>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl bg-[#0E1424] px-3 py-3">
              <div className="text-sm font-semibold text-white">{item.playerName}</div>
              <div className="mt-1 text-xs text-white/60">
                {item.status} · {item.costLabel}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-[#0E1424] px-3 py-3 text-sm text-white/60">
          No keeper declarations have been submitted yet.
        </div>
      )}
    </section>
  )
}
