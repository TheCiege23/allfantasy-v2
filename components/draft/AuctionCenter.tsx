import { AuctionBidder } from './AuctionBidder'

export function AuctionCenter({
  playerName,
  position,
  team,
  currentBid,
  leadingTeam,
  minBid,
  onBid,
}: {
  playerName?: string | null
  position?: string | null
  team?: string | null
  currentBid?: number | null
  leadingTeam?: string | null
  minBid: number
  onBid?: (amount: number) => Promise<void> | void
}) {
  return (
    <div className="grid gap-4 rounded-2xl border border-white/10 bg-[#081121] p-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">
          Currently up for bid
        </p>
        <p className="text-2xl font-semibold text-white">{playerName ?? 'Waiting for nomination'}</p>
        <p className="text-sm text-white/60">
          {position ?? '—'}
          {team ? ` • ${team}` : ''}
        </p>
        <div className="rounded-xl border border-cyan-400/15 bg-cyan-500/10 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-cyan-200">Current bid</p>
          <p className="mt-1 text-xl font-semibold text-white">${currentBid ?? minBid}</p>
          <p className="text-sm text-white/60">
            {leadingTeam ? `Leading: ${leadingTeam}` : 'No bids yet'}
          </p>
        </div>
      </div>
      <AuctionBidder minBid={Math.max(minBid, currentBid ?? minBid)} onBid={onBid} />
    </div>
  )
}
