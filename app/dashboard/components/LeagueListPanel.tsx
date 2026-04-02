'use client'

import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { UserLeague } from '../types'

const FAVORITES_KEY = 'af-league-favorites'
const ORDER_KEY = 'af-league-order'
const SYNC_EVENT = 'af-dashboard-league-list-sync'

type LeagueListPanelProps = {
  leagues: UserLeague[]
  selectedId: string | null
  onSelect: (league: UserLeague) => void
  compact?: boolean
  loading?: boolean
}

type ConceptBadge = {
  label: string
  className: string
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function readStoredIds(key: string) {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return isStringArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStoredIds(key: string, value: string[]) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    window.dispatchEvent(new Event(SYNC_EVENT))
  } catch {}
}

function getPlatformEmoji(platform: string) {
  switch (platform.toLowerCase()) {
    case 'sleeper':
      return '🌙'
    case 'yahoo':
      return '🏈'
    case 'mfl':
      return '🏆'
    case 'fantrax':
      return '📊'
    case 'espn':
      return '🔴'
    default:
      return '🏈'
  }
}

function getStatusBadge(status: string | undefined) {
  switch ((status || '').toLowerCase()) {
    case 'pre_draft':
    case 'pre-draft':
      return {
        label: 'Pre-Draft',
        className: 'border-amber-500/30 bg-amber-500/20 text-amber-400',
      }
    case 'in_season':
    case 'in-season':
    case 'active':
      return {
        label: 'Active',
        className: 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400',
      }
    case 'completed':
      return {
        label: 'Done',
        className: 'border-gray-500/30 bg-gray-500/20 text-gray-400',
      }
    case 'off_season':
    case 'off-season':
      return {
        label: 'Off-Season',
        className: 'border-white/15 bg-white/10 text-white/40',
      }
    default:
      return {
        label: '—',
        className: 'border-white/15 bg-white/10 text-white/40',
      }
  }
}

function getConceptBadge(league: UserLeague): ConceptBadge {
  const formatSource = `${league.scoring || ''} ${league.format || ''}`.toLowerCase()

  if (league.isDynasty) {
    return {
      label: 'Dynasty',
      className: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
    }
  }

  if (formatSource.includes('guillotine')) {
    return {
      label: 'Guillotine',
      className: 'border-red-500/30 bg-red-500/15 text-red-300',
    }
  }

  if (formatSource.includes('best_ball') || formatSource.includes('best ball')) {
    return {
      label: 'Best Ball',
      className: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300',
    }
  }

  if (formatSource.includes('keeper')) {
    return {
      label: 'Keeper',
      className: 'border-violet-500/30 bg-violet-500/15 text-violet-300',
    }
  }

  return {
    label: 'Redraft',
    className: 'border-white/15 bg-white/10 text-white/50',
  }
}

function applySavedOrder(leagues: UserLeague[], orderedIds: string[]) {
  if (!orderedIds.length) return leagues

  const leagueMap = new Map(leagues.map((league) => [league.id, league] as const))
  const ordered: UserLeague[] = []
  const usedIds = new Set<string>()

  for (const leagueId of orderedIds) {
    const league = leagueMap.get(leagueId)
    if (!league || usedIds.has(leagueId)) continue
    ordered.push(league)
    usedIds.add(leagueId)
  }

  for (const league of leagues) {
    if (usedIds.has(league.id)) continue
    ordered.push(league)
  }

  return ordered
}

export function LeagueListPanel({
  leagues,
  selectedId,
  onSelect,
  compact = false,
  loading = false,
}: LeagueListPanelProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [orderedIds, setOrderedIds] = useState<string[]>([])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const draggedLeagueIdRef = useRef<string | null>(null)

  useEffect(() => {
    const syncFromStorage = () => {
      setFavoriteIds(readStoredIds(FAVORITES_KEY))
      setOrderedIds(readStoredIds(ORDER_KEY))
    }

    syncFromStorage()
    window.addEventListener('storage', syncFromStorage)
    window.addEventListener(SYNC_EVENT, syncFromStorage as EventListener)

    return () => {
      window.removeEventListener('storage', syncFromStorage)
      window.removeEventListener(SYNC_EVENT, syncFromStorage as EventListener)
    }
  }, [])

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds])

  const orderedLeagues = useMemo(() => applySavedOrder(leagues, orderedIds), [leagues, orderedIds])

  const favoriteSortedLeagues = useMemo(() => {
    const favorites: UserLeague[] = []
    const remaining: UserLeague[] = []

    for (const league of orderedLeagues) {
      if (favoriteSet.has(league.id)) {
        favorites.push(league)
      } else {
        remaining.push(league)
      }
    }

    return [...favorites, ...remaining]
  }, [favoriteSet, orderedLeagues])

  const displayedLeagues = useMemo(() => {
    if (compact || !search.trim()) return favoriteSortedLeagues

    const query = search.trim().toLowerCase()
    return favoriteSortedLeagues.filter((league) => league.name.toLowerCase().includes(query))
  }, [compact, favoriteSortedLeagues, search])

  const persistFavoriteIds = useCallback((nextFavoriteIds: string[]) => {
    setFavoriteIds(nextFavoriteIds)
    writeStoredIds(FAVORITES_KEY, nextFavoriteIds)
  }, [])

  const persistOrderedIds = useCallback((nextOrderedIds: string[]) => {
    setOrderedIds(nextOrderedIds)
    writeStoredIds(ORDER_KEY, nextOrderedIds)
  }, [])

  const handleFavoriteToggle = useCallback(
    (leagueId: string) => {
      const nextFavoriteIds = favoriteSet.has(leagueId)
        ? favoriteIds.filter((id) => id !== leagueId)
        : [...favoriteIds, leagueId]

      persistFavoriteIds(nextFavoriteIds)
    },
    [favoriteIds, favoriteSet, persistFavoriteIds]
  )

  const resetDragState = useCallback(() => {
    draggedLeagueIdRef.current = null
    setDraggingId(null)
    setDropTargetId(null)
  }, [])

  const handleDrop = useCallback(
    (targetLeagueId: string) => {
      const draggedLeagueId = draggedLeagueIdRef.current
      if (!draggedLeagueId || draggedLeagueId === targetLeagueId) {
        resetDragState()
        return
      }

      const visibleIds = displayedLeagues.map((league) => league.id)
      const draggedVisibleIndex = visibleIds.indexOf(draggedLeagueId)
      const targetVisibleIndex = visibleIds.indexOf(targetLeagueId)

      if (draggedVisibleIndex === -1 || targetVisibleIndex === -1) {
        resetDragState()
        return
      }

      const nextVisibleIds = [...visibleIds]
      ;[nextVisibleIds[draggedVisibleIndex], nextVisibleIds[targetVisibleIndex]] = [
        nextVisibleIds[targetVisibleIndex],
        nextVisibleIds[draggedVisibleIndex],
      ]

      const visibleSet = new Set(visibleIds)
      let nextVisibleIndex = 0
      const nextOrderedIds = favoriteSortedLeagues.map((league) => {
        if (!visibleSet.has(league.id)) return league.id
        const nextLeagueId = nextVisibleIds[nextVisibleIndex]
        nextVisibleIndex += 1
        return nextLeagueId
      })

      persistOrderedIds(nextOrderedIds)
      resetDragState()
    },
    [displayedLeagues, favoriteSortedLeagues, persistOrderedIds, resetDragState]
  )

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0a0a1f]">
      {!compact ? (
        <div className="border-b border-white/[0.07] px-3 py-3">
          <div className="flex items-center rounded-xl border border-white/[0.07] bg-white/[0.05] px-3 py-2">
            <Search className="h-4 w-4 flex-shrink-0 text-white/35" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search leagues..."
              className="ml-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
            />
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 [scrollbar-gutter:stable]">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-14 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : displayedLeagues.length ? (
          <div className="space-y-1.5">
            {displayedLeagues.map((league) => {
              const isSelected = league.id === selectedId
              const isFavorite = favoriteSet.has(league.id)
              const statusBadge = getStatusBadge(league.status)
              const conceptBadge = getConceptBadge(league)
              const isDragging = draggingId === league.id
              const isDropTarget = dropTargetId === league.id && draggingId !== league.id

              return (
                <div
                  key={league.id}
                  draggable
                  onClick={() => onSelect(league)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onSelect(league)
                    }
                  }}
                  onDragStart={() => {
                    draggedLeagueIdRef.current = league.id
                    setDraggingId(league.id)
                  }}
                  onDragEnd={resetDragState}
                  onDragOver={(event) => {
                    event.preventDefault()
                    if (draggedLeagueIdRef.current && draggedLeagueIdRef.current !== league.id) {
                      setDropTargetId(league.id)
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    handleDrop(league.id)
                  }}
                  role="button"
                  tabIndex={0}
                  className={`cursor-pointer rounded-xl border-l-2 px-2.5 py-2 text-left transition-all duration-150 ${
                    isSelected
                      ? 'border-l-cyan-500 bg-cyan-500/[0.08]'
                      : 'border-l-transparent hover:bg-white/[0.04]'
                  } ${isDragging ? 'opacity-40' : ''} ${isDropTarget ? 'border border-cyan-500/50' : 'border border-transparent'}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="pt-0.5 text-base">{getPlatformEmoji(league.platform)}</div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-white/85">{league.name}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleFavoriteToggle(league.id)
                            }}
                            className="text-sm leading-none text-white/55 transition hover:text-white"
                            aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
                          >
                            {isFavorite ? '★' : '☆'}
                          </button>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </span>
                        </div>
                      </div>

                      <div className="mt-1">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${conceptBadge.className}`}
                        >
                          {conceptBadge.label}
                        </span>
                      </div>

                      <p className="mt-1 text-[10px] text-white/40">
                        {(league.format || 'League').replace(/_/g, ' ')} · {league.teamCount} teams
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : leagues.length === 0 ? (
          <div className="flex h-full min-h-[220px] items-center justify-center px-3">
            <div className="w-full rounded-2xl border border-white/[0.07] bg-[#0c0c1e] px-4 py-6 text-center">
              <p className="text-sm font-semibold text-white/80">No leagues connected</p>
              <button
                type="button"
                onClick={() => router.push('/dashboard/rankings')}
                className="mt-3 inline-flex rounded-xl border border-cyan-500/50 px-3 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/10"
              >
                Import a League
              </button>
            </div>
          </div>
        ) : (
          <div className="px-3 py-10 text-center text-sm text-white/45">No leagues match your search.</div>
        )}
      </div>
    </div>
  )
}
