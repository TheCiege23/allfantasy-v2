
import { useEffect, useState } from 'react'

type LegacyImportStatus = {
  status: string
  progress?: number
  lastJobAt?: string
  error?: string
} | null

export function LegacyImportProgressWidget() {
  const [status, setStatus] = useState<LegacyImportStatus>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let pollTimeout: ReturnType<typeof setTimeout> | null = null
    const ACTIVE_IMPORT_STATUSES = new Set(['running', 'processing', 'in_progress', 'pending', 'queued'])

    async function fetchStatus(isInitialLoad: boolean) {
      if (isInitialLoad) setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/user/legacy-import-status', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch import status')
        const data = await res.json()
        if (!active) return
        const nextStatus = data.sleeperImportStatus || null
        setStatus(nextStatus)
        if (ACTIVE_IMPORT_STATUSES.has(nextStatus?.status)) {
          pollTimeout = setTimeout(() => {
            void fetchStatus(false)
          }, 5000)
        }
      } catch {
        if (!active) return
        setError('Could not load import status')
      } finally {
        if (!active || !isInitialLoad) return
        setLoading(false)
      }
    }

    void fetchStatus(true)
    return () => {
      active = false
      if (pollTimeout) clearTimeout(pollTimeout)
    }
  }, [])

  if (loading) {
    return <div className="mt-8 flex justify-center"><span className="text-xs text-white/60">Checking import status...</span></div>
  }
  if (error) {
    return <div className="mt-8 flex justify-center"><span className="text-xs text-red-400">{error}</span></div>
  }
  if (!status || status.status === 'none' || status.status === 'not_started') {
    return null
  }
  return (
    <div className="fixed left-1/2 bottom-8 z-40 w-full max-w-md -translate-x-1/2 rounded-2xl border border-cyan-500 bg-[#0c0c1e] px-6 py-4 shadow-2xl">
      <div className="flex flex-col items-center">
        <span className="text-cyan-300 font-bold text-sm mb-1">Legacy Import Progress</span>
        <span className="text-xs text-white/70 mb-2">{status.status === 'in_progress' ? 'Importing your leagues...' : status.status === 'completed' ? 'Import complete!' : status.status === 'failed' ? 'Import failed' : status.status}</span>
        {typeof status.progress === 'number' && (
          <div className="w-full bg-white/10 rounded-full h-2 mb-2">
            <div className="bg-gradient-to-r from-cyan-400 to-violet-400 h-2 rounded-full" style={{ width: `${status.progress}%` }} />
          </div>
        )}
        {status.error && <span className="text-xs text-red-400">{status.error}</span>}
        {status.lastJobAt && <span className="text-[10px] text-white/30 mt-1">Last updated: {new Date(status.lastJobAt).toLocaleString()}</span>}
      </div>
    </div>
  )
}
