"use client"

import type { TimeframeId } from "./MetaInsightsDashboard"

const OPTIONS: { value: TimeframeId; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
]

export function TimeframeFilter({
  value,
  onChange,
}: {
  value: TimeframeId
  onChange: (v: TimeframeId) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as TimeframeId)}
      className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
      aria-label="Timeframe filter"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
