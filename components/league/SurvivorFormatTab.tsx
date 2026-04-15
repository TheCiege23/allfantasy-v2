'use client'

import { useState, useEffect } from 'react'

type SurvivorFormatTabProps = {
  leagueId: string
  initialIdolExpiryWeek?: number | null
  onSave?: (values: { survivorIdolExpiryWeek: number | null }) => Promise<void> | void
}

/**
 * Survivor format settings tab. Currently exposes the Idol Expiry Week control
 * so commissioners can override the Final-5 default.
 */
export default function SurvivorFormatTab({
  leagueId,
  initialIdolExpiryWeek,
  onSave,
}: SurvivorFormatTabProps) {
  const [idolExpiryWeek, setIdolExpiryWeek] = useState<string>(
    typeof initialIdolExpiryWeek === 'number' ? String(initialIdolExpiryWeek) : '',
  )
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    setIdolExpiryWeek(
      typeof initialIdolExpiryWeek === 'number' ? String(initialIdolExpiryWeek) : '',
    )
  }, [initialIdolExpiryWeek])

  async function handleSave() {
    setSaving(true)
    setStatus(null)
    try {
      const parsed =
        idolExpiryWeek.trim() === '' ? null : Number.parseInt(idolExpiryWeek, 10)
      if (parsed !== null && (!Number.isFinite(parsed) || parsed < 1)) {
        setStatus('Please enter a positive week number or leave blank.')
        return
      }
      const payload = { survivorIdolExpiryWeek: parsed }
      if (onSave) {
        await onSave(payload)
      } else {
        await fetch(`/api/league/${leagueId}/survivor-format`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      setStatus('Saved.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setStatus(`Error: ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <label
          htmlFor="survivor-idol-expiry-week"
          className="block text-sm font-medium text-neutral-200"
        >
          Idol expiry week
        </label>
        <input
          id="survivor-idol-expiry-week"
          type="number"
          min={1}
          value={idolExpiryWeek}
          onChange={(e) => setIdolExpiryWeek(e.target.value)}
          className="mt-1 w-32 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm"
          placeholder="Final 5"
        />
        <p className="mt-1 text-xs text-neutral-400">
          Week after which unused idols expire. Leave blank for Final 5 default.
        </p>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="rounded bg-orange-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      {status && <p className="text-xs text-neutral-400">{status}</p>}
    </div>
  )
}
