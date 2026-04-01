'use client'

import { useState } from 'react'

export function AuctionBidder({
  minBid,
  onBid,
  loading = false,
}: {
  minBid: number
  onBid?: (amount: number) => Promise<void> | void
  loading?: boolean
}) {
  const [amount, setAmount] = useState(minBid)

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setAmount((value) => Math.max(minBid, value - 1))}
          className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/70"
        >
          -
        </button>
        <input
          value={amount}
          onChange={(event) => setAmount(Math.max(minBid, Number(event.target.value) || minBid))}
          className="w-full rounded-xl border border-white/10 bg-[#081121] px-3 py-2 text-center text-sm text-white"
        />
        <button
          type="button"
          onClick={() => setAmount((value) => value + 1)}
          className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/70"
        >
          +
        </button>
      </div>
      {onBid ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => onBid(amount)}
          className="w-full rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100"
        >
          {loading ? 'Placing Bid...' : `Place $${amount} Bid`}
        </button>
      ) : null}
    </div>
  )
}
