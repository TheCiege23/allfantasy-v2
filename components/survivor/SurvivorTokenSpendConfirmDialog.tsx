'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export function SurvivorTokenSpendConfirmDialog({
  open,
  title,
  message,
  tokenCost,
  featureLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message?: string
  tokenCost: number
  featureLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-cyan-500/25 bg-[#070c18] p-6 shadow-[0_0_60px_-12px_rgba(34,211,238,0.2)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300/80">AF Tokens</p>
        <h2 className="mt-2 text-lg font-bold text-white">{title}</h2>
        {message ? <p className="mt-2 text-sm text-white/65">{message}</p> : null}
        <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
          <p className="text-sm text-white/80">
            Spend{' '}
            <span className="font-mono text-lg font-bold text-cyan-200">{tokenCost}</span> token
            {tokenCost === 1 ? '' : 's'}
            {featureLabel ? (
              <>
                {' '}
                for <span className="text-white">{featureLabel}</span>
              </>
            ) : null}
            ?
          </p>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/85 hover:bg-white/[0.08]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2.5 text-sm font-semibold text-cyan-50 hover:bg-cyan-500/25"
          >
            Confirm spend
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
