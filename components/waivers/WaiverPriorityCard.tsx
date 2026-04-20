"use client"

import { ListOrdered } from "lucide-react"

type Props = {
  waiverPriority: number | null
  /** Lower is better (typical waiver order) */
  label?: string
  loading?: boolean
  className?: string
}

export default function WaiverPriorityCard({
  waiverPriority,
  label = "Waiver priority",
  loading,
  className = "",
}: Props) {
  if (loading) {
    return (
      <span
        className={`inline-flex h-8 min-w-[9rem] animate-pulse rounded-lg border border-white/10 bg-white/5 ${className}`}
        data-testid="waiver-priority-card-loading"
      />
    )
  }
  if (waiverPriority == null) return null
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg border border-white/20 bg-black/30 px-2.5 py-1 text-xs text-white/80 sm:text-sm ${className}`}
      data-testid="waiver-priority-card"
      title="Lower numbers process earlier when priority order applies."
    >
      <ListOrdered className="h-3.5 w-3.5 shrink-0" />
      {label}: {waiverPriority}
    </span>
  )
}
