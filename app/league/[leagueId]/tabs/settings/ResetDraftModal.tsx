'use client'

import { useState } from 'react'
import { DangerButton, Input } from './components'

export function ResetDraftModal({
  open,
  leagueId,
  onClose,
  onSuccess,
}: {
  open: boolean
  leagueId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const canSubmit = confirmText === 'RESET DRAFT' && !loading

  const submit = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/league/settings/reset-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, confirmText }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Reset failed')
        return
      }
      onSuccess()
      onClose()
      setConfirmText('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0c1220] p-6 shadow-xl">
        <h3 className="text-[16px] font-bold text-white">Reset Draft — This Cannot Be Undone</h3>
        <p className="mt-2 text-[12px] leading-relaxed text-white/50">
          All draft picks will be deleted and the draft session returned to pre-draft. Draft settings stay as-is.
        </p>
        <p className="mt-4 text-[12px] text-white/50">
          Type <strong className="text-white">RESET DRAFT</strong> to confirm:
        </p>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="RESET DRAFT"
          className="mt-2 w-full"
          autoComplete="off"
        />
        {error ? <p className="mt-2 text-[11px] text-red-400">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              onClose()
              setConfirmText('')
              setError(null)
            }}
            className="rounded-xl px-4 py-2 text-[13px] font-semibold text-white/60 hover:bg-white/[0.06] hover:text-white"
          >
            Cancel
          </button>
          <DangerButton onClick={() => void submit()} disabled={!canSubmit}>
            {loading ? '…' : 'Reset Draft'}
          </DangerButton>
        </div>
      </div>
    </div>
  )
}
