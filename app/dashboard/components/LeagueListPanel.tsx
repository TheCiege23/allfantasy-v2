'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Star } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { UserLeague } from '../types'
import { LeagueAvatar } from './LeagueAvatar'

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

function getPlatformPill(platform: string | undefined): { label: string; className: string } {
  const p = (platform || 'allfantasy').toLowerCase()
  if (p === 'sleeper') return { label: 'Sleeper', className: 'bg-emerald-500/20 text-emerald-400' }
  if (p === 'yahoo') return { label: 'Yahoo', className: 'bg-violet-500/20 text-violet-400' }
  if (p === 'espn') return { label: 'ESPN', className: 'bg-red-500/20 text-red-400' }
  if (p === 'cbs') return { label: 'CBS', className: 'bg-white/10 text-white/50' }
  return {
    label: p === 'allfantasy' ? 'AF' : p.replace(/_/g, ' ').slice(0, 12),
    className: 'bg-white/10 text-white/50',
  }
}

function getLeagueStatusDisplay(league: UserLeague): { label: string; className: string } {
  const s = (league.status || '').toLowerCase().replace(/-/g, '_')
  if (s === 'pre_draft') {
    return { label: 'Pre-Draft', className: 'bg-orange-500/20 text-orange-400' }
  }
  if (s === 'drafting') {
    return { label: 'Drafting', className: 'bg-orange-500/20 text-orange-400' }
  }
  if (s === 'in_season' || s === 'active') {
    const w = league.currentWeek
    return {
      label: typeof w === 'number' && w > 0 ? `Week ${w}` : 'In Season',
      className: 'bg-green-500/20 text-green-400',
    }
  }
  if (s === 'complete' || s === 'completed') {
    return { label: 'Final', className: 'bg-white/10 text-white/40' }
  }
  if (s === 'off_season') {
    return { label: 'Off-Season', className: 'bg-white/10 text-white/40' }
  }
  return { label: '—', className: 'bg-white/10 text-white/40' }
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
    <div className="flex h-full min-w-0 w-full max-w-full flex-col overflow-hidden bg-[#0a0a1f]">
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

      <div
        className={`min-h-0 min-w-0 w-full flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 ${
          compact ? '' : '[scrollbar-gutter:stable]'
        }`}
      >
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className={`rounded-xl bg-white/5 animate-pulse ${compact ? 'h-[52px]' : 'h-14'}`}
              />
            ))}
          </div>
        ) : displayedLeagues.length ? (
          <div className="w-full min-w-0 space-y-1.5">
            {displayedLeagues.map((league) => {
              const isSelected = league.id === selectedId
              const isFavorite = favoriteSet.has(league.id)
              const statusBadge = getLeagueStatusDisplay(league)
              const conceptBadge = getConceptBadge(league)
              const platformPill = getPlatformPill(league.platform)
              const sportLabel = (league.sport || 'NFL').toString().toUpperCase()
              const seasonLabel =
                league.season !== undefined && league.season !== null ? String(league.season) : '—'
              const scoringLabel = league.scoring || 'Standard'
              const isDragging = draggingId === league.id
              const isDropTarget = dropTargetId === league.id && draggingId !== league.id

              return (
                <div
                  key={league.id}
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
                  className={`w-full min-w-0 rounded-xl border transition-all duration-150 ${
                    isDragging ? 'opacity-40' : ''
                  } ${isDropTarget ? 'border-cyan-500/50' : 'border-transparent'}`}
                >
                  <div className="flex w-full min-w-0 items-stretch gap-1">
                    <div
                      draggable
                      onDragStart={(event) => {
                        draggedLeagueIdRef.current = league.id
                        setDraggingId(league.id)
                        event.dataTransfer.effectAllowed = 'move'
                        event.dataTransfer.setData('text/plain', league.id)
                      }}
                      onDragEnd={resetDragState}
                      className="flex w-4 shrink-0 cursor-grab select-none items-center justify-center self-stretch rounded-md text-white/20 hover:text-white/50 active:cursor-grabbing"
                      aria-label="Reorder league"
                      title="Drag to reorder"
                    >
                      <span aria-hidden className="flex flex-col items-center gap-0 text-[9px] leading-none">
                        <span>⋮</span>
                        <span className="-mt-0.5">⋮</span>
                      </span>
                    </div>

                    <Link
                      href={`/league/${league.id}`}
                      className={`block min-w-0 max-w-full flex-1 rounded-xl border-l-2 text-left outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-cyan-500/40 ${
                        isSelected
                          ? 'border-l-cyan-500 bg-cyan-500/[0.08] hover:bg-cyan-500/12'
                          : 'border-l-transparent hover:bg-white/[0.04]'
                      } ${
                        compact
                          ? 'min-h-[52px] px-2 py-2'
                          : 'min-w-0 px-2 py-1.5'
                      }`}
                      onClick={() => onSelect(league)}
                      scroll
                    >
                      <div className={`flex gap-2 ${compact ? 'items-center' : 'items-start'}`}>
                        <div className={`shrink-0 ${compact ? '' : 'pt-0.5'}`}>
                          <LeagueAvatar league={league} size={compact ? 24 : 36} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-start justify-between gap-1">
                            <p
                              className={`min-w-0 truncate font-semibold text-white/90 ${
                                compact ? 'text-[11px]' : 'text-[13px]'
                              }`}
                            >
                              {league.name}
                            </p>
                            <span
                              className={`shrink-0 font-semibold ${
                                compact
                                  ? `rounded-md px-1.5 py-0.5 text-[8px] ${statusBadge.className}`
                                  : `rounded-full px-1.5 py-0.5 text-[9px] ${statusBadge.className}`
                              }`}
                            >
                              {statusBadge.label}
                            </span>
                          </div>

                          <div
                            className={`flex flex-wrap items-center gap-0.5 ${compact ? 'mt-0.5' : 'mt-1 gap-1'}`}
                          >
                            <span
                              className={`rounded font-bold uppercase tracking-wide ${platformPill.className} ${
                                compact ? 'px-1 py-0.5 text-[8px]' : 'px-1.5 py-0.5 text-[9px]'
                              }`}
                            >
                              {platformPill.label}
                            </span>
                            <span
                              className={`rounded bg-white/[0.06] font-semibold uppercase tracking-wide text-white/55 ${
                                compact ? 'px-1 py-0.5 text-[8px]' : 'px-1.5 py-0.5 text-[9px]'
                              }`}
                            >
                              {sportLabel}
                            </span>
                            {!compact ? (
                              <span
                                className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${conceptBadge.className}`}
                              >
                                {conceptBadge.label}
                              </span>
                            ) : null}
                          </div>

                          <p
                            className={`truncate text-white/40 ${compact ? 'mt-0.5 text-[8px]' : 'mt-1 text-[10px]'}`}
                          >
                            {league.teamCount}-team · {seasonLabel} · {scoringLabel}
                          </p>
                        </div>
                      </div>
                    </Link>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        handleFavoriteToggle(league.id)
                      }}
                      className={`shrink-0 text-white/55 transition hover:text-white ${
                        compact ? 'self-center p-0.5' : 'self-start pt-0.5 text-sm leading-none'
                      }`}
                      aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
                    >
                      {compact ? (
                        <Star
                          className={`h-3 w-3 ${isFavorite ? 'fill-amber-400 text-amber-400' : 'text-white/55'}`}
                          strokeWidth={isFavorite ? 0 : 1.5}
                        />
                      ) : isFavorite ? (
                        '★'
                      ) : (
                        '☆'
                      )}
                    </button>
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
