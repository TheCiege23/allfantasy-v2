'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import clsx from 'clsx'

type ImportJob = {
  id: string
  provider: string
  status: string
  progress: number
  totalSeasons: number
  completedSeasons: number
  sleeperUsername: string | null
  leagueCount: number | null
  createdAt: string
  seasons: Array<{
    season: number
    status: string
    leagueCount: number | null
    wins: number | null
    losses: number | null
  }>
}

/**
 * Import Progress Tracker — shows active and recent import jobs with progress bars.
 * Polls for updates every 5 seconds while jobs are in progress.
 * Links to rankings dashboard when complete.
 */
export function ImportProgressTracker() {
  const [jobs, setJobs] = useState<ImportJob[]>([])
  const [loading, setLoading] = useState(true)

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/league/import/status', { credentials: 'include' })
      if (res.ok) {
        const data = (await res.json()) as { jobs: ImportJob[] }
        setJobs(data.jobs ?? [])
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  // Poll while jobs are in progress
  useEffect(() => {
    const hasActive = jobs.some((j) => j.status === 'processing' || j.status === 'queued')
    if (!hasActive) return
    const iv = setInterval(loadJobs, 5000)
    return () => clearInterval(iv)
  }, [jobs, loadJobs])

  if (loading) return null
  if (jobs.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-[12px] font-bold uppercase tracking-wide text-white/40">Import Progress</p>
      {jobs.map((job) => (
        <ImportJobCard key={job.id} job={job} />
      ))}
    </div>
  )
}

function ImportJobCard({ job }: { job: ImportJob }) {
  const isActive = job.status === 'processing' || job.status === 'queued'
  const isComplete = job.status === 'complete'
  const isFailed = job.status === 'failed' || job.status === 'error'

  const statusColor = isComplete
    ? 'text-emerald-400'
    : isActive
      ? 'text-cyan-300'
      : isFailed
        ? 'text-red-400'
        : 'text-white/50'

  const statusLabel = isComplete
    ? 'Complete'
    : isActive
      ? 'Importing...'
      : isFailed
        ? 'Failed'
        : job.status

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {job.provider === 'sleeper' ? '🟣' : job.provider === 'fantrax' ? '🔵' : '📋'}
          </span>
          <div>
            <p className="text-[13px] font-semibold text-white">
              {job.provider.charAt(0).toUpperCase() + job.provider.slice(1)} Import
            </p>
            {job.sleeperUsername && (
              <p className="text-[11px] text-white/40">@{job.sleeperUsername}</p>
            )}
          </div>
        </div>
        <span className={clsx('text-[11px] font-bold', statusColor)}>
          {isActive && (
            <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
          )}
          {statusLabel}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] text-white/40">
          <span>{job.completedSeasons} / {job.totalSeasons} seasons</span>
          <span>{job.progress}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500',
              isComplete ? 'bg-emerald-500' : isActive ? 'bg-cyan-500' : isFailed ? 'bg-red-500' : 'bg-white/20',
            )}
            style={{ width: `${Math.max(2, job.progress)}%` }}
          />
        </div>
      </div>

      {/* Season chips */}
      {job.seasons.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {job.seasons.map((s) => (
            <span
              key={s.season}
              className={clsx(
                'rounded px-1.5 py-0.5 text-[9px] font-bold',
                s.status === 'complete' ? 'bg-emerald-500/15 text-emerald-300' :
                s.status === 'processing' ? 'bg-cyan-500/15 text-cyan-300 animate-pulse' :
                s.status === 'failed' ? 'bg-red-500/15 text-red-300' :
                'bg-white/10 text-white/40',
              )}
            >
              {s.season}
              {s.wins != null && s.losses != null ? ` (${s.wins}-${s.losses})` : ''}
            </span>
          ))}
        </div>
      )}

      {/* Link to rankings when complete */}
      {isComplete && (
        <Link
          href="/dashboard/rankings"
          className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-2 text-[12px] font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
        >
          View Your Rankings & Grade →
        </Link>
      )}

      {/* Import date */}
      <p className="mt-2 text-[10px] text-white/30">
        Started {new Date(job.createdAt).toLocaleDateString()}
        {job.leagueCount ? ` · ${job.leagueCount} leagues` : ''}
      </p>
    </div>
  )
}
