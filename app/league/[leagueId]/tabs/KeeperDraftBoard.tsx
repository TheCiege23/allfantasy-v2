'use client'

export function KeeperDraftBoard({ leagueId }: { leagueId: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a1220] px-4 py-3 text-[12px] text-white/50">
      Keeper draft board for league <span className="text-white/75">{leagueId}</span> — wire player list to mark
      KEPT / excluded from pool using <span className="text-sky-300/90">/api/keeper/draft-prep</span>.
    </div>
  )
}
