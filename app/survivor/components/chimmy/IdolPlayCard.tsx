'use client'

import { useState } from 'react'

export function IdolPlayCard({
  powerName,
  description,
  onConfirm,
}: {
  powerName: string
  description: string
  onConfirm?: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-200">🔮 Hidden power</p>
      <p className="mt-1 text-[15px] font-semibold text-white">{powerName}</p>
      <p className="mt-2 text-[12px] leading-relaxed text-white/65">{description}</p>
      {!open ? (
        <button
          type="button"
          className="mt-3 w-full min-h-[48px] rounded-lg bg-amber-500/25 text-[13px] font-semibold text-amber-50"
          onClick={() => setOpen(true)}
        >
          Play before votes are revealed?
        </button>
      ) : (
        <div className="mt-3 space-y-2" role="dialog" aria-label="Confirm idol play">
          <p className="text-[12px] text-white/75">This cannot be undone.</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="min-h-[44px] flex-1 rounded-lg border border-white/15 text-[13px]"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="min-h-[44px] flex-1 rounded-lg bg-amber-500 text-[13px] font-semibold text-black"
              onClick={() => onConfirm?.()}
            >
              Confirm play
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
