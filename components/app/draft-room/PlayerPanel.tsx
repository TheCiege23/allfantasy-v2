'use client'

import React, { useState, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, User, Plus } from 'lucide-react'
import { getPositionFilterOptionsForSport, filterByPosition } from '@/lib/draft-room'
import { DraftPlayerCard } from './DraftPlayerCard'
import type { PlayerDisplayModel } from '@/lib/draft-sports-models/types'

const PLAYER_ROW_ESTIMATE_HEIGHT = 56

export type PlayerEntry = {
  id?: string
  name: string
  position: string
  team: string | null
  adp?: number | null
  byeWeek?: number | null
  aiAdp?: number | null
  aiAdpSampleSize?: number
  aiAdpLowSample?: boolean
  /** Normalized display model for player image, team logo, stats */
  display?: PlayerDisplayModel | null
  /** Devy: true when from college/devy pool */
  isDevy?: boolean
  /** Devy: school (e.g. "Ohio State") */
  school?: string | null
  /** Devy: promoted to NFL */
  graduatedToNFL?: boolean
  /** C2C: 'college' | 'pro' for Campus-to-Canton */
  poolType?: 'college' | 'pro'
}

export type PlayerPanelProps = {
  players: PlayerEntry[]
  draftedNames: Set<string>
  sport: string
  /** When user is on clock, show Draft button */
  canDraft: boolean
  onAddToQueue: (player: PlayerEntry) => void
  onMakePick: (player: PlayerEntry) => void
  /** Show current user's drafted roster (roster view) */
  currentRoster?: Array<{ playerName: string; position: string; team: string | null }>
  useAiAdp?: boolean
  onUseAiAdpChange?: (value: boolean) => void
  loading?: boolean
  /** When true, AI ADP is enabled but no data (show message, keep sort controls working) */
  aiAdpUnavailable?: boolean
  /** Optional message when AI ADP is enabled but unavailable */
  aiAdpUnavailableMessage?: string | null
  /** When true, segment or entries have low sample size (show warning) */
  aiAdpLowSampleWarning?: boolean
  /** Auction: when true, show Nominate as primary action (instead of Draft) */
  canNominate?: boolean
  /** Auction: called when user clicks Nominate for a player */
  onNominate?: (player: PlayerEntry) => void
  /** Devy: when enabled, show Pro/Devy filter and devy round hint */
  devyConfig?: { enabled: boolean; devyRounds: number[] }
  /** C2C: when enabled, show College/Pro filter and college/pro round hint */
  c2cConfig?: { enabled: boolean; collegeRounds: number[] }
  /** Current draft round (for devy/C2C round hints) */
  currentRound?: number
  /** When 'IDP', position filter includes Offense, DL, LB, DB, DE, DT, CB, S, IDP FLEX */
  formatType?: string
}

type SortKey = 'adp' | 'name'

function PlayerListVirtualized({
  filtered,
  draftedNames,
  canDraft,
  canNominate,
  useAiAdp,
  onMakePick,
  onAddToQueue,
  onNominate,
  scrollRef,
}: {
  filtered: PlayerEntry[]
  draftedNames: Set<string>
  canDraft: boolean
  canNominate: boolean
  useAiAdp: boolean
  onMakePick: (player: PlayerEntry) => void
  onAddToQueue: (player: PlayerEntry) => void
  onNominate?: (player: PlayerEntry) => void
  scrollRef: React.RefObject<HTMLDivElement | null>
}) {
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => PLAYER_ROW_ESTIMATE_HEIGHT,
    overscan: 5,
  })

  const items = virtualizer.getVirtualItems()

  return (
    <div
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
      }}
    >
      {items.map((virtualRow) => {
        const p = filtered[virtualRow.index]
        return (
          <div
            key={p.id ?? p.name}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
            data-index={virtualRow.index}
          >
            <DraftPlayerCard
              display={p.display ?? null}
              name={p.name}
              position={p.position}
              team={p.team}
              adp={useAiAdp ? p.aiAdp : p.adp}
              byeWeek={p.byeWeek}
              isDrafted={draftedNames.has(p.name)}
              variant="row"
              isDevy={p.isDevy}
              school={p.school}
              graduatedToNFL={p.graduatedToNFL}
              poolType={p.poolType}
              primaryAction={
                canNominate && onNominate ? (
                  <button
                    type="button"
                    onClick={() => onNominate(p)}
                    className="min-h-[44px] min-w-[44px] sm:min-w-0 sm:px-2 sm:py-1 inline-flex items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 py-2 text-xs text-amber-200 hover:bg-amber-500/30 touch-manipulation"
                  >
                    Nominate
                  </button>
                ) : canDraft ? (
                  <button
                    type="button"
                    onClick={() => onMakePick(p)}
                    className="min-h-[44px] min-w-[44px] sm:min-w-0 sm:px-2 sm:py-1 inline-flex items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/30 touch-manipulation"
                  >
                    Draft
                  </button>
                ) : undefined
              }
              secondaryAction={
                <button
                  type="button"
                  onClick={() => onAddToQueue(p)}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-white/20 text-white/70 hover:bg-white/10 touch-manipulation"
                  aria-label={`Add ${p.name} to queue`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              }
            />
          </div>
        )
      })}
    </div>
  )
}

function PlayerPanelInner({
  players,
  draftedNames,
  sport,
  canDraft,
  onAddToQueue,
  onMakePick,
  currentRoster = [],
  useAiAdp = false,
  onUseAiAdpChange,
  loading = false,
  aiAdpUnavailable = false,
  aiAdpUnavailableMessage = null,
  aiAdpLowSampleWarning = false,
  canNominate = false,
  onNominate,
  devyConfig,
  c2cConfig,
  currentRound,
  formatType,
}: PlayerPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [positionFilter, setPositionFilter] = useState('All')
  const [teamFilter, setTeamFilter] = useState('All')
  const [poolFilter, setPoolFilter] = useState<'All' | 'Pro' | 'Devy' | 'College'>('All')
  const [sortBy, setSortBy] = useState<SortKey>('adp')
  const [showRosterView, setShowRosterView] = useState(false)
  const isDevyRound = Boolean(devyConfig?.enabled && !c2cConfig?.enabled && currentRound != null && devyConfig.devyRounds?.includes(currentRound))
  const isCollegeRound = Boolean(c2cConfig?.enabled && currentRound != null && c2cConfig.collegeRounds?.includes(currentRound))
  const isProRound = Boolean(c2cConfig?.enabled && currentRound != null && !c2cConfig.collegeRounds?.includes(currentRound))
  const showPoolFilter = Boolean(devyConfig?.enabled || c2cConfig?.enabled)

  const positionOptions = useMemo(
    () => getPositionFilterOptionsForSport(sport, formatType),
    [sport, formatType],
  )

  const teamOptions = useMemo(() => {
    const teams = new Set(players.map((p) => p.team).filter(Boolean) as string[])
    return ['All', ...Array.from(teams).sort()]
  }, [players])

  const scrollRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    let list = players.filter((p) => !draftedNames.has(p.name))
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.team ?? '').toLowerCase().includes(q) ||
          (p.school ?? '').toLowerCase().includes(q),
      )
    }
    if (positionFilter !== 'All') {
      const asDraft = list.map((p) => ({ name: p.name, position: p.position, team: p.team }))
      const filteredDraft = filterByPosition(asDraft, positionFilter)
      list = list.filter((p) => filteredDraft.some((d) => d.name === p.name && d.position === p.position))
    }
    if (teamFilter !== 'All') {
      list = list.filter((p) => p.team === teamFilter)
    }
    if (c2cConfig?.enabled && poolFilter !== 'All') {
      if (poolFilter === 'College') list = list.filter((p) => p.poolType === 'college' || (p.isDevy === true && p.poolType !== 'pro'))
      else if (poolFilter === 'Pro') list = list.filter((p) => p.poolType === 'pro' || (p.isDevy !== true && p.poolType !== 'college'))
    } else if (devyConfig?.enabled && poolFilter !== 'All') {
      if (poolFilter === 'Devy') list = list.filter((p) => p.isDevy === true)
      else if (poolFilter === 'Pro') list = list.filter((p) => p.isDevy !== true)
    }
    const adpVal = useAiAdp ? ((p: PlayerEntry) => p.aiAdp ?? p.adp ?? 999) : ((p: PlayerEntry) => p.adp ?? 999)
    const nameVal = (p: PlayerEntry) => p.name
    if (sortBy === 'adp') {
      list = [...list].sort((a, b) => (adpVal(a) ?? 999) - (adpVal(b) ?? 999))
    } else {
      list = [...list].sort((a, b) => nameVal(a).localeCompare(nameVal(b)))
    }
    return list
  }, [players, draftedNames, searchQuery, positionFilter, teamFilter, poolFilter, devyConfig?.enabled, c2cConfig?.enabled, sortBy, useAiAdp])

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-white/12 bg-black/25">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-2.5">
        <div className="flex flex-1 min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 touch-manipulation">
          <Search className="h-4 w-4 shrink-0 text-white/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players..."
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/40"
            aria-label="Search players"
          />
        </div>
        <select
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          className="min-h-[44px] rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white touch-manipulation"
          aria-label="Position filter"
        >
          {positionOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="min-h-[44px] rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white touch-manipulation"
          aria-label="Team filter"
        >
          {teamOptions.slice(0, 32).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {showPoolFilter && (
          <select
            value={poolFilter}
            onChange={(e) => setPoolFilter(e.target.value as 'All' | 'Pro' | 'Devy' | 'College')}
            className="min-h-[44px] rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white touch-manipulation"
            aria-label="Pool filter"
          >
            <option value="All">All</option>
            {c2cConfig?.enabled ? (
              <>
                <option value="College">College</option>
                <option value="Pro">Pro</option>
              </>
            ) : (
              <>
                <option value="Pro">Pro</option>
                <option value="Devy">Devy</option>
              </>
            )}
          </select>
        )}
      </div>
      {isCollegeRound && (
        <div className="border-b border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[10px] text-violet-200">
          College round (C2C) — select a college-eligible player.
        </div>
      )}
      {isProRound && (
        <div className="border-b border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-200">
          Pro round (C2C) — select an NFL player.
        </div>
      )}
      {isDevyRound && (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200">
          Devy round — select a college/devy-eligible player.
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-2.5 py-2">
        <span className="text-[10px] text-white/50">Sort:</span>
        <button
          type="button"
          onClick={() => setSortBy('adp')}
          className={`min-h-[44px] rounded-lg px-3 py-2 text-xs touch-manipulation ${sortBy === 'adp' ? 'bg-cyan-500/20 text-cyan-200' : 'text-white/70 hover:bg-white/10'}`}
        >
          ADP
        </button>
        <button
          type="button"
          onClick={() => setSortBy('name')}
          className={`min-h-[44px] rounded-lg px-3 py-2 text-xs touch-manipulation ${sortBy === 'name' ? 'bg-cyan-500/20 text-cyan-200' : 'text-white/70 hover:bg-white/10'}`}
        >
          Name
        </button>
        {useAiAdp && (
          <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] text-cyan-300" title="Player order uses AI ADP">
            AI ADP
          </span>
        )}
        {onUseAiAdpChange && (
          <label className="min-h-[44px] flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[10px] text-white/70 hover:bg-white/5 touch-manipulation">
            <input
              type="checkbox"
              checked={useAiAdp}
              onChange={(e) => onUseAiAdpChange(e.target.checked)}
              className="rounded border-white/20 w-4 h-4 shrink-0"
              aria-label="Use AI ADP for sort order"
            />
            Use AI ADP
          </label>
        )}
        {aiAdpUnavailable && (
          <span className="text-[10px] text-amber-400/90" title={aiAdpUnavailableMessage ?? undefined}>
            AI ADP data not ready
          </span>
        )}
        {useAiAdp && aiAdpLowSampleWarning && !aiAdpUnavailable && (
          <span className="text-[10px] text-amber-400/90" title="Some ADP values based on few drafts">
            Low sample
          </span>
        )}
        <button
          type="button"
          onClick={() => setShowRosterView((v) => !v)}
          className="ml-auto min-h-[44px] flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-white/70 hover:bg-white/10 touch-manipulation"
        >
          <User className="h-3.5 w-3.5" />
          {showRosterView ? 'Pool' : 'My roster'}
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto overscroll-contain p-2.5">
        {loading ? (
          <p className="py-4 text-center text-xs text-white/50">Loading pool…</p>
        ) : showRosterView ? (
          <ul className="space-y-1">
            {currentRoster.length === 0 ? (
              <li className="text-[10px] text-white/50">No picks yet.</li>
            ) : (
              currentRoster.map((p, i) => (
                <li
                  key={`${p.playerName}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[11px]"
                >
                  <span className="font-medium text-white">{p.playerName}</span>
                  <span className="text-white/55">{p.position}{p.team ? ` · ${p.team}` : ''}</span>
                </li>
              ))
            )}
          </ul>
        ) : (
          <PlayerListVirtualized
            filtered={filtered}
            draftedNames={draftedNames}
            canDraft={canDraft}
            canNominate={canNominate}
            useAiAdp={useAiAdp}
            onMakePick={onMakePick}
            onAddToQueue={onAddToQueue}
            onNominate={onNominate}
            scrollRef={scrollRef}
          />
        )}
      </div>
    </section>
  )
}

export const PlayerPanel = React.memo(PlayerPanelInner)
