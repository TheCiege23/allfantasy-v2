'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { BookmarkCheck, ChevronLeft, History, Loader2, Sparkles } from 'lucide-react'
import SavedRecommendationsPanel, {
  type SavedRecommendationsFilterState,
} from '@/components/chimmy-surfaces/SavedRecommendationsPanel'
import SavedRecommendationDetailModal from '@/components/chimmy-surfaces/SavedRecommendationDetailModal'
import ChimmyPersonalizationHints from '@/components/chimmy-surfaces/ChimmyPersonalizationHints'
import type { RecommendationCategory, UnifiedSavedRecommendation } from '@/lib/chimmy-actions/AIActionModel'
import { useSavedRecommendation } from '@/lib/saved-recommendations/useSavedRecommendations'

const SORT_VALUES = new Set(['newest', 'acted_on', 'stale'])
const STATUS_VALUES = new Set(['saved', 'acted_on', 'dismissed', 'stale'])
const RECOMMENDATION_TYPE_VALUES = new Set<RecommendationCategory>([
  'waiver',
  'trade',
  'lineup',
  'start_sit',
  'draft',
  'player_comparison',
  'matchup_simulation',
  'roster_strategy',
  'story_draft',
  'commissioner_announcement',
  'league_health',
  'general',
])

export default function AISavedPage() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const params = searchParams ?? new URLSearchParams()
  const currentPathname = pathname ?? '/ai/saved'

  const selectedId = params.get('rec')
  const [selectedFromList, setSelectedFromList] = useState<UnifiedSavedRecommendation | null>(null)
  const {
    rec: selectedFromApi,
    isLoading: isSelectedLoading,
    error: selectedLoadError,
  } = useSavedRecommendation(selectedId)

  const selected = useMemo(() => {
    if (!selectedId) return null
    if (selectedFromList?.id === selectedId) return selectedFromList
    return selectedFromApi
  }, [selectedId, selectedFromList, selectedFromApi])

  const parsedFilters = useMemo<SavedRecommendationsFilterState>(() => {
    const sport = params.get('sport') ?? ''
    const recommendationTypeParam = params.get('type') ?? ''
    const recommendationType = RECOMMENDATION_TYPE_VALUES.has(recommendationTypeParam as RecommendationCategory)
      ? (recommendationTypeParam as RecommendationCategory)
      : ''
    const statusParam = params.get('status') ?? ''
    const status = STATUS_VALUES.has(statusParam) ? statusParam : ''
    const leagueFilter = params.get('league') ?? ''
    const showArchived = params.get('archived') === '1'
    const sortParam = params.get('sort') ?? 'newest'
    const sortMode = SORT_VALUES.has(sortParam) ? (sortParam as 'newest' | 'acted_on' | 'stale') : 'newest'

    return {
      sport,
      recommendationType,
      status: status as SavedRecommendationsFilterState['status'],
      leagueFilter,
      showArchived,
      sortMode,
    }
  }, [params])

  const handleFiltersChange = useCallback(
    (filters: SavedRecommendationsFilterState) => {
      const next = new URLSearchParams(params.toString())
      next.delete('sport')
      next.delete('type')
      next.delete('status')
      next.delete('league')
      next.delete('archived')
      next.delete('sort')

      if (filters.sport) next.set('sport', filters.sport)
      if (filters.recommendationType) next.set('type', filters.recommendationType)
      if (filters.status) next.set('status', filters.status)
      if (filters.leagueFilter) next.set('league', filters.leagueFilter)
      if (filters.showArchived) next.set('archived', '1')
      if (filters.sortMode !== 'newest') next.set('sort', filters.sortMode)

      const nextSearch = next.toString()
      const currentSearch = params.toString()
      if (nextSearch === currentSearch) return

      router.replace(nextSearch ? `${currentPathname}?${nextSearch}` : currentPathname, { scroll: false })
    },
    [currentPathname, params, router],
  )

  const setSelectedRecParam = useCallback(
    (recId: string | null) => {
      const next = new URLSearchParams(params.toString())
      if (recId) next.set('rec', recId)
      else next.delete('rec')

      const nextSearch = next.toString()
      const currentSearch = params.toString()
      if (nextSearch === currentSearch) return

      router.replace(nextSearch ? `${currentPathname}?${nextSearch}` : currentPathname, { scroll: false })
    },
    [currentPathname, params, router],
  )

  useEffect(() => {
    if (!selectedId) setSelectedFromList(null)
  }, [selectedId])

  useEffect(() => {
    if (!selectedId) return
    if (selectedFromList) return
    if (isSelectedLoading) return
    if (selectedFromApi) return
    if (!selectedLoadError) return
    setSelectedRecParam(null)
  }, [
    selectedId,
    selectedFromList,
    isSelectedLoading,
    selectedFromApi,
    selectedLoadError,
    setSelectedRecParam,
  ])

  return (
    <div className="mode-surface min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/ai/tools"
              className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white/90"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to AI tools
            </Link>
            <Link
              href="/ai/history"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs text-white/75 hover:bg-white/10"
            >
              <History className="h-3.5 w-3.5" />
              Legacy history
            </Link>
          </div>

          <Link
            href="/chimmy"
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/20"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Open Chimmy
          </Link>
        </div>

        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-white">Saved Recommendations Hub</h1>
          <p className="mt-1 text-sm text-white/55">
            Review AI memory across sports and leagues, then reopen, execute, or archive with context.
          </p>
        </div>

        <ChimmyPersonalizationHints className="mb-4" />

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
            <BookmarkCheck className="h-4 w-4 text-indigo-300" />
            <p className="text-sm font-semibold text-white">Your Saved Decision Memory</p>
          </div>

          <SavedRecommendationsPanel
            className="h-[68vh]"
            initialSport={parsedFilters.sport}
            initialRecommendationType={parsedFilters.recommendationType}
            initialStatus={parsedFilters.status}
            initialLeagueFilter={parsedFilters.leagueFilter}
            initialShowArchived={parsedFilters.showArchived}
            initialSortMode={parsedFilters.sortMode}
            onFiltersChange={handleFiltersChange}
            onOpenDetail={(rec) => {
              setSelectedFromList(rec)
              setSelectedRecParam(rec.id)
            }}
          />
        </section>
      </div>

      {selectedId && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm p-3 sm:p-6">
          <div className="mx-auto h-full w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#0b1020]">
            {selected ? (
              <SavedRecommendationDetailModal
                rec={selected}
                onClose={() => {
                  setSelectedFromList(null)
                  setSelectedRecParam(null)
                }}
                onDeleted={() => {
                  setSelectedFromList(null)
                  setSelectedRecParam(null)
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-white/55">
                {isSelectedLoading ? (
                  <div className="inline-flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading recommendation...
                  </div>
                ) : (
                  <div className="text-sm">This recommendation is unavailable.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
