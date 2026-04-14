'use client'

/**
 * SavedRecommendationsPanel
 *
 * The main list view for saved Chimmy recommendations.
 * Shows filters (sport, type, status) + a scrollable grid of saved rec cards.
 * Used as a drawer body, right-rail panel, or standalone section.
 */

import { useState, useCallback, useEffect } from 'react'
import {
  Bookmark,
  BookmarkCheck,
  Filter,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import {
  useSavedRecommendationsList,
  useUpdateRecommendationStatus,
} from '@/lib/saved-recommendations/useSavedRecommendations'
import type { UnifiedSavedRecommendation, SavedRecommendationStatus, RecommendationCategory } from '@/lib/chimmy-actions/AIActionModel'
import SavedRecommendationRow from './SavedRecommendationRow'

// ─── Filter configs ─────────────────────────────────────────────────────────────

const SPORT_OPTIONS = [
  { value: '', label: 'All Sports' },
  { value: 'NFL', label: 'NFL' },
  { value: 'NBA', label: 'NBA' },
  { value: 'MLB', label: 'MLB' },
  { value: 'NHL', label: 'NHL' },
  { value: 'CFB', label: 'College FB' },
  { value: 'CBB', label: 'College BB' },
]

const TYPE_OPTIONS: { value: '' | RecommendationCategory; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'waiver', label: 'Waiver' },
  { value: 'trade', label: 'Trade' },
  { value: 'lineup', label: 'Lineup' },
  { value: 'start_sit', label: 'Start/Sit' },
  { value: 'draft', label: 'Draft' },
  { value: 'player_comparison', label: 'Player Compare' },
  { value: 'matchup_simulation', label: 'Matchup Sim' },
  { value: 'roster_strategy', label: 'Roster Strategy' },
  { value: 'league_health', label: 'League Health' },
  { value: 'commissioner_announcement', label: 'Commissioner' },
]

const STATUS_OPTIONS: { value: '' | SavedRecommendationStatus; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'saved', label: 'Saved' },
  { value: 'acted_on', label: 'Acted On' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'stale', label: 'Stale' },
]

// ─── Props ──────────────────────────────────────────────────────────────────────

export interface SavedRecommendationsPanelProps {
  leagueId?: string | null
  leagueOptions?: Array<{ id: string; label: string }>
  initialSport?: string
  initialRecommendationType?: RecommendationCategory | ''
  initialStatus?: SavedRecommendationStatus | ''
  initialShowArchived?: boolean
  initialLeagueFilter?: string
  initialSortMode?: 'newest' | 'acted_on' | 'stale'
  onFiltersChange?: (filters: SavedRecommendationsFilterState) => void
  /** Scroll container className override */
  className?: string
  /** Callback when user opens a rec to view detail */
  onOpenDetail?: (rec: UnifiedSavedRecommendation) => void
  /** Compact mode (no filter bar header) */
  compact?: boolean
}

export interface SavedRecommendationsFilterState {
  sport: string
  recommendationType: RecommendationCategory | ''
  status: SavedRecommendationStatus | ''
  showArchived: boolean
  leagueFilter: string
  sortMode: 'newest' | 'acted_on' | 'stale'
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function SavedRecommendationsPanel({
  leagueId,
  leagueOptions = [],
  initialSport = '',
  initialRecommendationType = '',
  initialStatus = '',
  initialShowArchived = false,
  initialLeagueFilter = '',
  initialSortMode = 'newest',
  onFiltersChange,
  className = '',
  onOpenDetail,
  compact = false,
}: SavedRecommendationsPanelProps) {
  const [sport, setSport] = useState<string>(initialSport)
  const [recType, setRecType] = useState<RecommendationCategory | ''>(initialRecommendationType)
  const [status, setStatus] = useState<SavedRecommendationStatus | ''>(initialStatus)
  const [showArchived, setShowArchived] = useState(initialShowArchived)
  const [showFilters, setShowFilters] = useState(false)
  const [leagueFilter, setLeagueFilter] = useState<string>(initialLeagueFilter)
  const [sortMode, setSortMode] = useState<'newest' | 'acted_on' | 'stale'>(initialSortMode)

  const { items, total, leagueOptions: fetchedLeagueOptions, isLoading, error, refetch, loadMore, hasMore } =
    useSavedRecommendationsList({
      leagueId: (leagueFilter || leagueId) ?? null,
      sport: sport || null,
      recommendationType: recType || null,
      status: status || null,
      isArchived: showArchived,
      limit: 20,
    })

  const { archive, updateStatus, isUpdating } = useUpdateRecommendationStatus()

  const handleArchive = useCallback(
    async (rec: UnifiedSavedRecommendation) => {
      await archive(rec.id, true)
      refetch()
    },
    [archive, refetch],
  )

  const handleMarkActedOn = useCallback(
    async (rec: UnifiedSavedRecommendation) => {
      await updateStatus(rec.id, 'acted_on')
      refetch()
    },
    [updateStatus, refetch],
  )

  const allLeagues = [
    ...leagueOptions,
    ...fetchedLeagueOptions,
    ...items
      .filter((rec) => typeof rec.leagueId === 'string' && rec.leagueId.length > 0)
      .map((rec) => ({
        id: rec.leagueId as string,
        label: (rec.recommendationPayload?.leagueName as string | undefined) ?? `League ${String(rec.leagueId).slice(0, 8)}`,
      })),
  ].filter((entry, index, arr) => arr.findIndex((x) => x.id === entry.id) === index)

  const sortedItems = [...items].sort((a, b) => {
    if (sortMode === 'acted_on') {
      const aScore = a.status === 'acted_on' ? 1 : 0
      const bScore = b.status === 'acted_on' ? 1 : 0
      if (aScore !== bScore) return bScore - aScore
    }
    if (sortMode === 'stale') {
      const aScore = a.status === 'stale' ? 1 : 0
      const bScore = b.status === 'stale' ? 1 : 0
      if (aScore !== bScore) return bScore - aScore
    }
    return b.createdAt - a.createdAt
  })

  useEffect(() => {
    onFiltersChange?.({
      sport,
      recommendationType: recType,
      status,
      showArchived,
      leagueFilter,
      sortMode,
    })
  }, [sport, recType, status, showArchived, leagueFilter, sortMode, onFiltersChange])

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/[0.07] shrink-0">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-indigo-400" />
            <span className="text-sm font-semibold text-white">Saved Recs</span>
            {total > 0 && (
              <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300">
                {total}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowFilters((f) => !f)}
              className={`rounded-lg p-1.5 transition ${
                showFilters ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'
              }`}
              title="Toggle filters"
            >
              <Filter className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={refetch}
              className="rounded-lg p-1.5 text-white/40 hover:text-white hover:bg-white/10 transition"
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="px-4 py-3 border-b border-white/[0.07] bg-white/[0.02] space-y-2 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-wide mb-1">
                Sport
              </label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                aria-label="Filter by sport"
                title="Filter by sport"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500/40"
              >
                {SPORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-wide mb-1">
                Type
              </label>
              <select
                value={recType}
                onChange={(e) => setRecType(e.target.value as RecommendationCategory | '')}
                aria-label="Filter by recommendation type"
                title="Filter by recommendation type"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500/40"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-wide mb-1">
                League
              </label>
              <select
                value={leagueFilter}
                onChange={(e) => setLeagueFilter(e.target.value)}
                aria-label="Filter by league"
                title="Filter by league"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500/40"
              >
                <option value="">All Leagues</option>
                {allLeagues.map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-[10px] text-white/40 uppercase tracking-wide mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SavedRecommendationStatus | '')}
                aria-label="Filter by status"
                title="Filter by status"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500/40"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-[10px] text-white/40 uppercase tracking-wide mb-1">
                Sort
              </label>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as 'newest' | 'acted_on' | 'stale')}
                aria-label="Sort recommendations"
                title="Sort recommendations"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500/40"
              >
                <option value="newest">Newest</option>
                <option value="acted_on">Acted On</option>
                <option value="stale">Stale First</option>
              </select>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer pt-4">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-white/20 bg-white/10 accent-indigo-500"
              />
              <span className="text-xs text-white/50">Archived</span>
            </label>
          </div>
        </div>
      )}

      {/* List body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading && items.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-white/40">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
            <span className="text-sm text-red-400">{error}</span>
            <button
              type="button"
              onClick={refetch}
              className="text-xs text-white/40 underline"
            >
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
            <BookmarkCheck className="h-8 w-8 text-white/15" />
            <p className="text-sm text-white/40">No saved recommendations yet.</p>
            <p className="text-xs text-white/25">
              Use the bookmark icon on any Chimmy recommendation to save it here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {sortedItems.map((rec) => (
              <SavedRecommendationRow
                key={rec.id}
                rec={rec}
                onOpen={onOpenDetail}
                onArchive={handleArchive}
                onMarkActedOn={handleMarkActedOn}
                isUpdating={isUpdating}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && !isLoading && (
          <div className="px-4 py-3 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              className="text-xs text-white/50 hover:text-white transition"
            >
              Load more
            </button>
          </div>
        )}

        {/* Loading more indicator */}
        {isLoading && items.length > 0 && (
          <div className="flex justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-white/30" />
          </div>
        )}
      </div>
    </div>
  )
}
