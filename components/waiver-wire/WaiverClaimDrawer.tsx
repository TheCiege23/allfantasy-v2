"use client"

import { useState, useEffect } from "react"
import { X, DollarSign, ArrowDownCircle } from "lucide-react"

type DrawerProps = {
  open: boolean
  onClose: () => void
  player: { id: string; name: string; position: string | null; team: string | null } | null
  faabMode: boolean
  faabRemaining: number | null
  onSubmit: (opts: { dropPlayerId: string | null; faabBid: number | null; priorityOrder: number | null }) => Promise<void> | void
  rosterPlayerIds: string[]
}

export default function WaiverClaimDrawer({
  open,
  onClose,
  player,
  faabMode,
  faabRemaining,
  onSubmit,
  rosterPlayerIds,
}: DrawerProps) {
  const [dropId, setDropId] = useState<string>("")
  const [bid, setBid] = useState<string>("")
  const [priority, setPriority] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setDropId("")
      setBid("")
      setPriority("")
      setSubmitting(false)
    }
  }, [open])

  if (!open || !player) return null

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const faabBid =
        faabMode && bid !== ""
          ? Math.max(
              0,
              Math.min(
                Number(bid) || 0,
                (faabRemaining ?? (Number(bid) || 0)),
              ),
            )
          : null
      const priorityOrder = priority !== "" ? Number(priority) || 0 : null
      await onSubmit({
        dropPlayerId: dropId || null,
        faabBid,
        priorityOrder,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const content = (
    <div className="w-full max-w-md rounded-t-2xl border border-white/15 bg-black/95 p-4 shadow-2xl sm:h-full sm:max-w-md sm:rounded-none sm:border-l sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/50">Waiver claim</p>
          <h2 className="text-sm font-semibold text-white">
            Add {player.name}{" "}
            <span className="text-xs text-white/60">
              {player.position} · {player.team || "FA"}
            </span>
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-white/60 hover:bg-white/10"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 space-y-3 text-xs text-white/80">
        <div>
          <label className="mb-1 block text-[11px] text-white/60">Drop player (optional)</label>
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="h-3.5 w-3.5 text-white/40" />
            <select
              value={dropId}
              onChange={(e) => setDropId(e.target.value)}
              className="flex-1 rounded-lg border border-white/20 bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
            >
              <option value="">No drop (requires open roster spot)</option>
              {rosterPlayerIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
        </div>

        {faabMode && (
          <div>
            <label className="mb-1 block text-[11px] text-white/60">FAAB bid</label>
            <div className="flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5 text-cyan-300" />
              <input
                type="number"
                min={0}
                max={faabRemaining ?? undefined}
                value={bid}
                onChange={(e) => setBid(e.target.value)}
                className="w-24 rounded-lg border border-white/20 bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
              />
              {faabRemaining != null && (
                <span className="text-[11px] text-cyan-200">Remaining: {faabRemaining}</span>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-[11px] text-white/60">Claim priority (optional)</label>
          <input
            type="number"
            min={0}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-28 rounded-lg border border-white/20 bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
          />
        </div>

        <p className="mt-1 text-[11px] text-white/50">
          Claims will be processed according to your league&apos;s waiver settings. AI suggestions are advisory only and do
          not guarantee that a claim will succeed.
        </p>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-cyan-400 disabled:opacity-60"
        >
          {submitting && (
            <span className="h-3 w-3 animate-spin rounded-full border border-black/10 border-t-black" />
          )}
          Confirm claim
        </button>
      </div>
    </div>
  )
}

