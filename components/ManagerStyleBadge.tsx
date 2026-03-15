'use client'

import { useState, useEffect } from 'react'

interface ProfileData {
  profileLabels: string[]
}

/**
 * Fetches and displays manager behavior labels (e.g. "trade-heavy, aggressive") for a given league + manager.
 * Use in trade finder, draft room, or any view where a manager is in context.
 */
export function ManagerStyleBadge({
  leagueId,
  managerId,
  className = '',
}: {
  leagueId: string
  managerId: string
  className?: string
}) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!leagueId || !managerId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const url = `/api/leagues/${encodeURIComponent(leagueId)}/psychological-profiles?managerId=${encodeURIComponent(managerId)}`
    fetch(url, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.profile?.profileLabels?.length) setProfile(data.profile)
        else setProfile(null)
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [leagueId, managerId])

  if (loading) {
    return (
      <span className={`inline-block h-4 w-12 animate-pulse rounded bg-white/10 ${className}`} title="Loading style…" />
    )
  }
  if (!profile?.profileLabels?.length) return null

  const labelText = profile.profileLabels.slice(0, 3).join(', ')
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border border-purple-500/25 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-200 ${className}`}
      title={`Manager style: ${labelText}`}
    >
      <span className="opacity-75">Style:</span>
      {labelText}
    </span>
  )
}
