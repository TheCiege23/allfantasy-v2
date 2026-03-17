'use client'

import { useState, useCallback, useEffect } from 'react'
import { Upload, AlertCircle, CheckCircle, RotateCcw } from 'lucide-react'

export type DraftImportFlowProps = {
  leagueId: string
  onSuccess?: () => void
  onClose?: () => void
}

type ValidateResult = {
  valid: boolean
  parseError?: string
  report?: { errors: Array<{ code: string; message: string; field?: string }>; warnings: Array<{ code: string; message: string }>; canProceed: boolean }
  preview?: {
    summary: { pickCount: number; tradedPickCount: number; keeperCount: number; slotOrderLength: number }
    picks?: unknown[]
    slotOrder?: unknown[]
  }
}

export function DraftImportFlow({ leagueId, onSuccess, onClose }: DraftImportFlowProps) {
  const [jsonInput, setJsonInput] = useState('')
  const [validateResult, setValidateResult] = useState<ValidateResult | null>(null)
  const [validateLoading, setValidateLoading] = useState(false)
  const [commitLoading, setCommitLoading] = useState(false)
  const [rollbackLoading, setRollbackLoading] = useState(false)
  const [hasBackup, setHasBackup] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchBackupStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/import/backup-status`)
      const data = await res.json().catch(() => ({}))
      setHasBackup(!!data.hasBackup)
    } catch {
      setHasBackup(false)
    }
  }, [leagueId])

  useEffect(() => {
    fetchBackupStatus()
  }, [fetchBackupStatus])

  const handleValidate = useCallback(async () => {
    setMessage(null)
    setValidateLoading(true)
    setValidateResult(null)
    try {
      let payload: unknown
      try {
        payload = jsonInput.trim() ? JSON.parse(jsonInput) : {}
      } catch {
        setValidateResult({ valid: false, parseError: 'Invalid JSON' })
        setValidateLoading(false)
        return
      }
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/import/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      })
      const data = await res.json().catch(() => ({}))
      setValidateResult({
        valid: data.valid ?? false,
        parseError: data.parseError,
        report: data.report,
        preview: data.preview,
      })
    } catch (e) {
      setValidateResult({ valid: false, parseError: (e as Error).message })
    } finally {
      setValidateLoading(false)
    }
  }, [leagueId, jsonInput])

  const handleCommit = useCallback(async () => {
    if (!validateResult?.valid || !validateResult.preview) return
    setMessage(null)
    setCommitLoading(true)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/import/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: validateResult.preview }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setMessage({ type: 'success', text: 'Import committed. A backup was saved for rollback.' })
        setValidateResult(null)
        setJsonInput('')
        setHasBackup(true)
        onSuccess?.()
      } else {
        setMessage({ type: 'error', text: data.error || 'Commit failed' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message })
    } finally {
      setCommitLoading(false)
    }
  }, [leagueId, validateResult, onSuccess])

  const handleRollback = useCallback(async () => {
    setMessage(null)
    setRollbackLoading(true)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/import/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setMessage({ type: 'success', text: 'Rollback complete. Draft state restored.' })
        setHasBackup(false)
        onSuccess?.()
      } else {
        setMessage({ type: 'error', text: data.error || 'Rollback failed' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message })
    } finally {
      setRollbackLoading(false)
    }
  }, [leagueId, onSuccess])

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-white">
        <Upload className="h-4 w-4 text-cyan-400" />
        Import draft data
      </div>
      <p className="text-xs text-white/60">
        Paste JSON with draftOrder, picks, and optionally tradedPicks, keeperConfig, keeperSelections, metadata.
      </p>
      <textarea
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
        placeholder='{"draftOrder":[{"slot":1,"displayName":"Team 1"},...],"picks":[{"overall":1,"round":1,"slot":1,"playerName":"...","position":"QB",...},...]}'
        className="h-32 w-full rounded border border-white/20 bg-black/40 px-3 py-2 font-mono text-xs text-white placeholder:text-white/40"
        aria-label="Import JSON"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleValidate}
          disabled={validateLoading}
          className="rounded bg-cyan-600 px-3 py-1.5 text-xs text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {validateLoading ? 'Validating…' : 'Validate (dry run)'}
        </button>
        {validateResult?.valid && validateResult.preview && (
          <button
            type="button"
            onClick={handleCommit}
            disabled={commitLoading}
            className="rounded bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {commitLoading ? 'Committing…' : 'Commit import'}
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
          >
            Cancel
          </button>
        )}
      </div>

      {validateResult?.parseError && (
        <div className="flex items-start gap-2 rounded border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{validateResult.parseError}</span>
        </div>
      )}
      {validateResult?.report && (validateResult.report.errors.length > 0 || validateResult.report.warnings.length > 0) && (
        <div className="space-y-1 rounded border border-white/10 bg-black/30 p-2 text-xs">
          {validateResult.report.errors.map((e, i) => (
            <div key={i} className="text-red-300">
              <span className="font-medium">{e.code}</span>: {e.message}
              {e.field && <span className="text-white/50"> ({e.field})</span>}
            </div>
          ))}
          {validateResult.report.warnings.map((w, i) => (
            <div key={i} className="text-amber-300">
              <span className="font-medium">{w.code}</span>: {w.message}
            </div>
          ))}
        </div>
      )}
      {validateResult?.valid && validateResult.preview?.summary && (
        <div className="flex items-center gap-2 rounded border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-200">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>
            Preview: {validateResult.preview.summary.pickCount} picks, {validateResult.preview.summary.tradedPickCount} traded picks,{' '}
            {validateResult.preview.summary.keeperCount} keepers, {validateResult.preview.summary.slotOrderLength} slots.
          </span>
        </div>
      )}

      {message && (
        <div
          className={`rounded border p-2 text-xs ${
            message.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-red-500/30 bg-red-500/10 text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {hasBackup && (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
          <span className="text-xs text-white/60">Last import can be undone.</span>
          <button
            type="button"
            onClick={handleRollback}
            disabled={rollbackLoading}
            className="inline-flex items-center gap-1.5 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {rollbackLoading ? 'Rolling back…' : 'Rollback last import'}
          </button>
        </div>
      )}
    </div>
  )
}
