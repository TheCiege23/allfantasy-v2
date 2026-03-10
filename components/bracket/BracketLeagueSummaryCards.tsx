import { Users, Trophy, Lock } from 'lucide-react'

export default function BracketLeagueSummaryCards({
  memberCount,
  entryCount,
  lockAt,
}: {
  memberCount: number
  entryCount: number
  lockAt?: string | Date | null
}) {
  const lockDate = lockAt ? new Date(lockAt) : null
  const isLocked = lockDate ? lockDate.getTime() <= Date.now() : false

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="mb-1 inline-flex rounded-lg border border-white/15 bg-black/30 p-1.5"><Users className="h-3.5 w-3.5 text-cyan-300" /></div>
        <div className="text-xs text-white/55">Members</div>
        <div className="text-lg font-semibold text-white">{memberCount}</div>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="mb-1 inline-flex rounded-lg border border-white/15 bg-black/30 p-1.5"><Trophy className="h-3.5 w-3.5 text-amber-300" /></div>
        <div className="text-xs text-white/55">Entries</div>
        <div className="text-lg font-semibold text-white">{entryCount}</div>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="mb-1 inline-flex rounded-lg border border-white/15 bg-black/30 p-1.5"><Lock className="h-3.5 w-3.5 text-purple-300" /></div>
        <div className="text-xs text-white/55">Lock Status</div>
        <div className="text-sm font-semibold text-white">{isLocked ? 'Locked' : 'Open'}</div>
        {lockDate && <div className="text-[11px] text-white/45 mt-0.5">{lockDate.toLocaleString()}</div>}
      </div>
    </div>
  )
}
