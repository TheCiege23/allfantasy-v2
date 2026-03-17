"use client"

import { getDiscoverySports } from "@/lib/public-discovery"
import type { DiscoveryFormat, DiscoverySort, EntryFeeFilter } from "@/lib/public-discovery/types"

export interface DiscoveryFiltersProps {
  sport: string
  format: DiscoveryFormat
  sort: DiscoverySort
  entryFee: EntryFeeFilter
  onSportChange: (v: string) => void
  onFormatChange: (v: DiscoveryFormat) => void
  onSortChange: (v: DiscoverySort) => void
  onEntryFeeChange: (v: EntryFeeFilter) => void
}

const FORMAT_OPTIONS: { value: DiscoveryFormat; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bracket", label: "Brackets" },
  { value: "creator", label: "Creator leagues" },
]

const SORT_OPTIONS: { value: DiscoverySort; label: string }[] = [
  { value: "popularity", label: "Popularity" },
  { value: "newest", label: "Newest" },
  { value: "filling_fast", label: "Filling fast" },
]

const ENTRY_FEE_OPTIONS: { value: EntryFeeFilter; label: string }[] = [
  { value: "all", label: "Any" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
]

export function DiscoveryFilters({
  sport,
  format,
  sort,
  entryFee,
  onSportChange,
  onFormatChange,
  onSortChange,
  onEntryFeeChange,
}: DiscoveryFiltersProps) {
  const sports = getDiscoverySports()

  return (
    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto" role="group" aria-label="Discovery filters">
      <select
        value={sport}
        onChange={(e) => onSportChange(e.target.value)}
        className="rounded-lg border px-3 py-2.5 text-sm min-h-[44px] touch-manipulation flex-1 sm:flex-initial min-w-0"
        style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
        aria-label="Filter by sport"
      >
        <option value="">All sports</option>
        {sports.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        value={format}
        onChange={(e) => onFormatChange(e.target.value as DiscoveryFormat)}
        className="rounded-lg border px-3 py-2.5 text-sm min-h-[44px] touch-manipulation flex-1 sm:flex-initial min-w-0"
        style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
        aria-label="Filter by format"
      >
        {FORMAT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as DiscoverySort)}
        className="rounded-lg border px-3 py-2.5 text-sm min-h-[44px] touch-manipulation flex-1 sm:flex-initial min-w-0"
        style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
        aria-label="Sort by"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        value={entryFee}
        onChange={(e) => onEntryFeeChange(e.target.value as EntryFeeFilter)}
        className="rounded-lg border px-3 py-2.5 text-sm min-h-[44px] touch-manipulation flex-1 sm:flex-initial min-w-0"
        style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
        aria-label="Filter by entry fee"
      >
        {ENTRY_FEE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
