'use client'

/**
 * D.2 — Sleeper-style dense table layout for the NFL draft pool.
 *
 * Renders aligned rows with a sticky header. Reuses PlayerAvatar (from E.1) for
 * headshot/initials/team-badge, and `nflDraftProjectionSplits` (from E.2.7) for
 * real PPG / passing / rushing / receiving values. Em-dashes for null cells.
 *
 * Columns:
 *   RK | PLAYER | ADP | AI ADP | BYE | PTS | AVG | RU ATT | RU YDS | RU TD |
 *   REC | REC YDS | REC TD | PA ATT | PA YDS | PA TD | PA INT | ACTIONS
 *
 * Virtualized via @tanstack/react-virtual so 300+ row pools stay 60fps.
 * Horizontally scrollable on small viewports — the table reserves a fixed min
 * width so columns don't squish; the parent container handles overflow.
 */

import React, { useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { GitCompare, Plus } from 'lucide-react'

import { PlayerAvatar } from './PlayerAvatar'
import type { PlayerEntry } from './PlayerPanel'
import { normalizePlayer } from '@/lib/players/normalizePlayer'
import { getPlayerImage } from '@/lib/players/getPlayerImage'
import {
  formatNflStatCell,
  type NflDraftProjectionSplits,
} from '@/lib/draft/analytics/nfl-draft-pool-projection-splits'
import {
  SLEEPER_POOL_TABLE_COLUMNS,
  SLEEPER_POOL_TABLE_HEADER_HEIGHT,
  SLEEPER_POOL_TABLE_MIN_WIDTH,
  SLEEPER_POOL_TABLE_ROW_HEIGHT,
  cellTooltip,
  type ColumnSpec,
} from './SleeperPoolTable.constants'
import {
  ariaSortValue,
  sortKeyForColumn,
  type PoolSortState,
} from './SleeperPoolSort'

export {
  SLEEPER_POOL_TABLE_COLUMNS,
  SLEEPER_POOL_TABLE_HEADER_HEIGHT,
  SLEEPER_POOL_TABLE_MIN_WIDTH,
  SLEEPER_POOL_TABLE_ROW_HEIGHT,
}

export interface SleeperPoolTableProps {
  filtered: PlayerEntry[]
  draftedNames: Set<string>
  draftedPlayerIds?: ReadonlySet<string> | null
  selectedPlayer: PlayerEntry | null
  isPlayerQueued?: (player: PlayerEntry) => boolean
  isPlayerDrafted: (player: PlayerEntry) => boolean
  canDraft: boolean
  canNominate?: boolean
  useAiAdp: boolean
  draftSport: string
  onDraftRequest: (player: PlayerEntry) => void
  onNominateRequest?: (player: PlayerEntry) => void
  onAddToQueue: (player: PlayerEntry) => void
  onPlayerSelect: (player: PlayerEntry) => void
  onCompareTap: (player: PlayerEntry) => void
  scrollRef: React.RefObject<HTMLDivElement | null>
  compareAnchor: PlayerEntry | null
  /** Override row height (used by storybook/tests). */
  rowHeight?: number
  /** Disable virtualization (used by tests / very small pools). */
  disableVirtualization?: boolean
  /** D.3 — current sort state. When omitted the headers render as plain labels (no click handler, no aria-sort). */
  sortState?: PoolSortState | null
  /** D.3 — invoked when a sortable header is activated (mouse click or keyboard Enter/Space). */
  onSortChange?: (columnKey: string) => void
}

const TOTAL_COLS_WIDTH = SLEEPER_POOL_TABLE_MIN_WIDTH

function rowKey(p: PlayerEntry): string {
  return `${p.name.trim().toLowerCase()}|${p.position.trim().toLowerCase()}|${String(p.team ?? '').trim().toLowerCase()}`
}

function dashOrNum(v: number | null | undefined, digits = 0): string {
  return formatNflStatCell(v, digits)
}

function dashOrInt(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) return '—'
  return String(Math.round(Number(v)))
}

/** Cell with consistent alignment + tabular numbers. */
function Cell({
  width,
  align,
  children,
  className = '',
  title,
}: {
  width: number
  align: 'left' | 'right'
  children: React.ReactNode
  className?: string
  title?: string
}) {
  return (
    <div
      style={{ width, minWidth: width, maxWidth: width }}
      className={`flex items-center px-2 ${align === 'right' ? 'justify-end tabular-nums' : 'justify-start'} ${className}`}
      title={title}
    >
      {children}
    </div>
  )
}

interface SleeperRowProps {
  player: PlayerEntry
  rank: number
  selected: boolean
  drafted: boolean
  queued: boolean
  canDraft: boolean
  canNominate: boolean
  useAiAdp: boolean
  draftSport: string
  isCompareAnchor: boolean
  rowHeight: number
  onSelect: () => void
  onCompareTap: () => void
  onAddToQueue: () => void
  onDraftRequest: () => void
  onNominateRequest?: () => void
  testIdBase: string
}

function SleeperRow(props: SleeperRowProps) {
  const {
    player: p,
    rank,
    selected,
    drafted,
    queued,
    canDraft,
    canNominate,
    useAiAdp,
    draftSport,
    isCompareAnchor,
    rowHeight,
    onSelect,
    onCompareTap,
    onAddToQueue,
    onDraftRequest,
    onNominateRequest,
    testIdBase,
  } = props

  const normalized = useMemo(
    () =>
      normalizePlayer({
        display: p.display ?? undefined,
        name: p.name,
        position: p.position,
        team: p.team,
        adp: useAiAdp ? p.aiAdp ?? undefined : p.adp ?? undefined,
        byeWeek: p.byeWeek ?? undefined,
        sport: draftSport,
      }),
    [p, useAiAdp, draftSport],
  )

  const headshotUrl = getPlayerImage(normalized, draftSport) ?? null
  const teamLogoUrl = normalized.teamLogoUrl ?? null
  const splits: NflDraftProjectionSplits | null = p.nflDraftProjectionSplits ?? null

  const adpDisplay = p.adp != null ? p.adp.toFixed(1) : '—'
  const aiAdpDisplay = p.aiAdp != null ? p.aiAdp.toFixed(1) : '—'
  const byeDisplay = p.byeWeek != null ? String(p.byeWeek) : '—'

  /** D.4 — per-cell tooltip helper: looks up the column's `statLabel` and feeds it
   * through `cellTooltip(playerName, label, value)` so every numeric cell carries
   * a friendly hover hint like "Bijan Robinson — rushing yards: 1,340" or
   * "Joe Burrow — no receiving yards data available" when null. */
  const tipFor = (columnKey: string, value: number | null | undefined): string => {
    const col = SLEEPER_POOL_TABLE_COLUMNS.find((c) => c.key === columnKey)
    const label = col?.statLabel ?? col?.label ?? columnKey
    return cellTooltip(p.name, label, value)
  }

  return (
    <div
      role="row"
      data-testid={testIdBase}
      data-drafted={drafted ? 'true' : 'false'}
      data-selected={selected ? 'true' : 'false'}
      onClick={() => {
        if (drafted) return
        onSelect()
      }}
      style={{ height: rowHeight, minWidth: TOTAL_COLS_WIDTH }}
      className={`flex items-stretch border-b border-white/5 text-xs transition-colors ${
        drafted
          ? 'bg-black/40 text-white/35'
          : selected
            ? 'bg-cyan-500/12 text-white/90'
            : 'bg-transparent text-white/82 hover:bg-white/[0.05] cursor-pointer'
      }`}
    >
      <Cell width={SLEEPER_POOL_TABLE_COLUMNS[0]!.width} align="right">
        <span className="text-white/55 text-[11px] font-medium" data-testid={`${testIdBase}-rk`}>
          {rank}
        </span>
      </Cell>

      <Cell width={SLEEPER_POOL_TABLE_COLUMNS[1]!.width} align="left" className="gap-2">
        <PlayerAvatar
          headshotUrl={headshotUrl}
          displayName={p.name}
          teamLogoUrl={teamLogoUrl}
          teamAbbr={p.team ?? null}
          position={p.position}
          size={36}
          testIdBase={`${testIdBase}-avatar`}
          highlighted={selected}
        />
        {/* Phase 2 — readability fix.
            Outer column: `min-w-0` so flex truncation works.
            Inner row 1: name + Drafted badge as flex siblings (badge `flex-shrink-0`).
                         Previous structure put the badge INSIDE the truncate span,
                         which collapsed weirdly under `white-space: nowrap`.
            Inner row 2: position/team as flex row, badge-style chips, no wrap. */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white/95"
              data-testid={`${testIdBase}-name`}
              title={
                drafted
                  ? `${p.name} — already drafted`
                  : `${p.name}${p.position ? ` (${p.position}${p.team ? `, ${p.team}` : ''})` : ''} — click row to open detail`
              }
            >
              {p.name}
            </span>
            {drafted ? (
              <span className="flex-shrink-0 rounded border border-white/15 bg-white/[0.05] px-1 py-px text-[9px] uppercase tracking-wider text-white/55">
                Drafted
              </span>
            ) : null}
          </div>
          <span className="truncate whitespace-nowrap text-[11px] text-white/55">
            <span className="font-semibold text-white/72">{p.position || '—'}</span>
            {p.team ? <span className="ml-1.5 text-white/45">{p.team}</span> : null}
          </span>
        </div>
      </Cell>

      <Cell width={SLEEPER_POOL_TABLE_COLUMNS[2]!.width} align="right">
        <span data-testid={`${testIdBase}-adp`} title={tipFor('adp', p.adp ?? null)}>
          {adpDisplay}
        </span>
      </Cell>
      <Cell width={SLEEPER_POOL_TABLE_COLUMNS[3]!.width} align="right">
        {/* D.5 — AI ADP cell. Value comes from AllFantasyAdpSnapshot via the pool
            resolver. Tooltip is the canonical D.5 description; a faint dot signals
            a low-sample reading so users know this number is still firming up. */}
        <span
          data-testid={`${testIdBase}-ai-adp`}
          data-low-sample={p.aiAdpLowSample ? 'true' : 'false'}
          title={
            p.aiAdp == null
              ? `AllFantasy AI ADP: average draft position from valid AllFantasy drafts matching this sport, league type, draft type, scoring, roster format, team count, and season. No drafts yet — em-dash until the next recompute.`
              : `AllFantasy AI ADP: average draft position from valid AllFantasy drafts matching this sport, league type, draft type, scoring, roster format, team count, and season.${p.aiAdpSampleSize != null ? ` Sample size: ${p.aiAdpSampleSize}.` : ''}${p.aiAdpLowSample ? ' Low sample — value will firm up as more drafts come in.' : ''}`
          }
          className="inline-flex items-center gap-1"
        >
          {aiAdpDisplay}
          {p.aiAdpLowSample && p.aiAdp != null ? (
            <span
              aria-hidden
              data-testid={`${testIdBase}-ai-adp-low-sample`}
              className="inline-block h-1.5 w-1.5 rounded-full bg-amber-300/70"
            />
          ) : null}
        </span>
      </Cell>
      <Cell width={SLEEPER_POOL_TABLE_COLUMNS[4]!.width} align="right">
        <span data-testid={`${testIdBase}-bye`} title={tipFor('bye', p.byeWeek ?? null)}>
          {byeDisplay}
        </span>
      </Cell>

      <Cell width={SLEEPER_POOL_TABLE_COLUMNS[5]!.width} align="right">
        <span data-testid={`${testIdBase}-pts`} title={tipFor('pts', splits?.projectedPoints ?? null)}>
          {dashOrNum(splits?.projectedPoints, 0)}
        </span>
      </Cell>
      <Cell width={SLEEPER_POOL_TABLE_COLUMNS[6]!.width} align="right">
        <span data-testid={`${testIdBase}-avg`} title={tipFor('avg', splits?.projectedPointsPerGame ?? null)}>
          {dashOrNum(splits?.projectedPointsPerGame, 1)}
        </span>
      </Cell>

      {/* Rushing */}
      <Cell width={SLEEPER_POOL_TABLE_COLUMNS[7]!.width} align="right">
        <span data-testid={`${testIdBase}-ru-att`} title={tipFor('ru_att', splits?.rushing.att ?? null)}>
          {dashOrInt(splits?.rushing.att ?? null)}
        </span>
      </Cell>
      <Cell width={SLEEPER_POOL_TABLE_COLUMNS[8]!.width} align="right">
        <span data-testid={`${testIdBase}-ru-yds`} title={tipFor('ru_yds', splits?.rushing.yds ?? null)}>
          {dashOrInt(splits?.rushing.yds ?? null)}
        </span>
      </Cell>
      <Cell width={SLEEPER_POOL_TABLE_COLUMNS[9]!.width} align="right">
        <span data-testid={`${testIdBase}-ru-td`} title={tipFor('ru_td', splits?.rushing.td ?? null)}>
          {dashOrInt(splits?.rushing.td ?? null)}
        </span>
      </Cell>

      {/* Receiving */}
      <Cell width={SLEEPER_POOL_TABLE_COLUMNS[10]!.width} align="right">
        <span data-testid={`${testIdBase}-rec`} title={tipFor('rec', splits?.receiving.rec ?? null)}>
          {dashOrInt(splits?.receiving.rec ?? null)}
        </span>
      </Cell>
      <Cell width={SLEEPER_POOL_TABLE_COLUMNS[11]!.width} align="right">
        <span data-testid={`${testIdBase}-rec-yds`} title={tipFor('rec_yds', splits?.receiving.yds ?? null)}>
          {dashOrInt(splits?.receiving.yds ?? null)}
        </span>
      </Cell>
      <Cell width={SLEEPER_POOL_TABLE_COLUMNS[12]!.width} align="right">
        <span data-testid={`${testIdBase}-rec-td`} title={tipFor('rec_td', splits?.receiving.td ?? null)}>
          {dashOrInt(splits?.receiving.td ?? null)}
        </span>
      </Cell>

      {/* Passing */}
      <Cell width={SLEEPER_POOL_TABLE_COLUMNS[13]!.width} align="right">
        <span data-testid={`${testIdBase}-pa-att`} title={tipFor('pa_att', splits?.passing.att ?? null)}>
          {dashOrInt(splits?.passing.att ?? null)}
        </span>
      </Cell>
      <Cell width={SLEEPER_POOL_TABLE_COLUMNS[14]!.width} align="right">
        <span data-testid={`${testIdBase}-pa-yds`} title={tipFor('pa_yds', splits?.passing.yds ?? null)}>
          {dashOrInt(splits?.passing.yds ?? null)}
        </span>
      </Cell>
      <Cell width={SLEEPER_POOL_TABLE_COLUMNS[15]!.width} align="right">
        <span data-testid={`${testIdBase}-pa-td`} title={tipFor('pa_td', splits?.passing.td ?? null)}>
          {dashOrInt(splits?.passing.td ?? null)}
        </span>
      </Cell>
      <Cell width={SLEEPER_POOL_TABLE_COLUMNS[16]!.width} align="right">
        <span data-testid={`${testIdBase}-pa-int`} title={tipFor('pa_int', splits?.passing.int ?? null)}>
          {dashOrInt(splits?.passing.int ?? null)}
        </span>
      </Cell>

      <Cell width={SLEEPER_POOL_TABLE_COLUMNS[17]!.width} align="right" className="gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onCompareTap()
          }}
          aria-label={isCompareAnchor ? 'Clear compare selection' : `Compare ${p.name}`}
          data-testid={`${testIdBase}-compare`}
          className={`inline-flex h-7 w-7 items-center justify-center rounded border transition ${
            isCompareAnchor
              ? 'border-amber-400/60 bg-amber-500/15 text-amber-100'
              : 'border-white/15 bg-black/25 text-white/65 hover:border-white/28 hover:bg-white/10'
          }`}
        >
          <GitCompare className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (drafted) return
            onAddToQueue()
          }}
          disabled={drafted}
          aria-label={`Queue ${p.name}`}
          data-testid={`${testIdBase}-queue`}
          className={`inline-flex h-7 w-7 items-center justify-center rounded border transition ${
            drafted
              ? 'cursor-not-allowed border-white/8 bg-black/20 text-white/25'
              : queued
                ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-100'
                : 'border-white/15 bg-black/25 text-white/65 hover:border-cyan-400/25 hover:bg-white/10'
          }`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        {canNominate && onNominateRequest ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onNominateRequest()
            }}
            data-testid={`${testIdBase}-nominate`}
            className="inline-flex h-7 items-center rounded border border-amber-400/45 bg-amber-500/15 px-2 text-[10px] font-semibold text-amber-100 hover:brightness-110"
          >
            Nominate
          </button>
        ) : (
          <button
            type="button"
            disabled={!canDraft || drafted}
            onClick={(e) => {
              e.stopPropagation()
              if (!canDraft || drafted) return
              onDraftRequest()
            }}
            title={drafted ? 'Player already drafted' : !canDraft ? 'Not your turn' : 'Draft this player'}
            data-testid={`${testIdBase}-draft`}
            className={`inline-flex h-7 items-center rounded border px-2 text-[10px] font-semibold transition ${
              drafted
                ? 'cursor-not-allowed border-white/8 bg-white/[0.04] text-white/30'
                : !canDraft
                  ? 'cursor-not-allowed border-white/10 bg-black/30 text-white/35'
                  : 'border-cyan-400/45 bg-gradient-to-br from-cyan-500/22 to-violet-600/18 text-cyan-50 hover:brightness-110'
            }`}
          >
            {drafted ? 'Drafted' : 'Draft'}
          </button>
        )}
      </Cell>
    </div>
  )
}

const MemoSleeperRow = React.memo(SleeperRow)

export function SleeperPoolTable(props: SleeperPoolTableProps) {
  const {
    filtered,
    selectedPlayer,
    isPlayerQueued,
    isPlayerDrafted,
    canDraft,
    canNominate = false,
    useAiAdp,
    draftSport,
    onDraftRequest,
    onNominateRequest,
    onAddToQueue,
    onPlayerSelect,
    onCompareTap,
    scrollRef,
    compareAnchor,
    rowHeight = SLEEPER_POOL_TABLE_ROW_HEIGHT,
    disableVirtualization = false,
    sortState = null,
    onSortChange,
  } = props

  const selectedKey = selectedPlayer ? rowKey(selectedPlayer) : null
  const compareKey = compareAnchor ? rowKey(compareAnchor) : null

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
    enabled: !disableVirtualization,
  })

  const items = virtualizer.getVirtualItems()
  const totalSize = disableVirtualization
    ? filtered.length * rowHeight
    : virtualizer.getTotalSize()

  return (
    <div
      role="table"
      aria-label="Draft pool players"
      data-testid="sleeper-pool-table"
      style={{ minWidth: TOTAL_COLS_WIDTH }}
      className="select-none"
    >
      {/* Sticky header — D.3: each column with a mapped sort key is a button. */}
      <div
        role="row"
        data-testid="sleeper-pool-table-header"
        className="sticky top-0 z-10 flex items-center border-b border-white/10 bg-[#0a1228] text-[10px] font-semibold uppercase tracking-wider text-white/55"
        style={{ height: SLEEPER_POOL_TABLE_HEADER_HEIGHT, minWidth: TOTAL_COLS_WIDTH }}
      >
        {SLEEPER_POOL_TABLE_COLUMNS.map((col) => {
          const ariaSort = sortState ? ariaSortValue(col.key, sortState) : 'none'
          const isActiveSort = ariaSort !== 'none'
          const sortable = Boolean(onSortChange) && sortKeyForColumn(col.key) != null

          const indicator = isActiveSort ? (ariaSort === 'ascending' ? '▲' : '▼') : null

          if (sortable) {
            const sortHint = isActiveSort
              ? ` · click to sort ${ariaSort === 'ascending' ? 'descending' : 'ascending'}`
              : ' · click to sort'
            const buttonTitle = `${col.title ?? col.label}${sortHint}`
            return (
              <Cell key={col.key} width={col.width} align={col.align}>
                <button
                  type="button"
                  aria-sort={ariaSort}
                  aria-label={col.title ?? col.label}
                  title={buttonTitle}
                  data-testid={`sleeper-pool-table-header-${col.key}`}
                  data-sort-active={isActiveSort ? 'true' : 'false'}
                  onClick={() => onSortChange?.(col.key)}
                  className={`inline-flex items-center gap-1 rounded px-1 py-px transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45 ${
                    isActiveSort
                      ? 'text-cyan-100 underline decoration-cyan-300/55 decoration-2 underline-offset-[3px]'
                      : 'text-white/55 hover:text-white/85'
                  }`}
                >
                  <span>{col.label}</span>
                  {indicator ? (
                    <span aria-hidden className="text-[8px] leading-none text-cyan-300/85">
                      {indicator}
                    </span>
                  ) : null}
                </button>
              </Cell>
            )
          }

          // Non-sortable column (actions, or sort state not provided).
          return (
            <Cell key={col.key} width={col.width} align={col.align} title={col.title}>
              <span data-testid={`sleeper-pool-table-header-${col.key}`}>{col.label}</span>
            </Cell>
          )
        })}
      </div>

      {/* Body */}
      <div
        style={{
          height: `${totalSize}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {disableVirtualization ? (
          filtered.map((p, idx) => {
            const k = rowKey(p)
            const drafted = isPlayerDrafted(p)
            const queued = Boolean(isPlayerQueued?.(p))
            return (
              <MemoSleeperRow
                key={p.id ?? k}
                player={p}
                rank={idx + 1}
                selected={selectedKey === k}
                drafted={drafted}
                queued={queued}
                canDraft={canDraft}
                canNominate={canNominate}
                useAiAdp={useAiAdp}
                draftSport={draftSport}
                isCompareAnchor={compareKey === k}
                rowHeight={rowHeight}
                onSelect={() => onPlayerSelect(p)}
                onCompareTap={() => onCompareTap(p)}
                onAddToQueue={() => onAddToQueue(p)}
                onDraftRequest={() => onDraftRequest(p)}
                onNominateRequest={onNominateRequest ? () => onNominateRequest(p) : undefined}
                testIdBase={`sleeper-pool-row-${idx}`}
              />
            )
          })
        ) : (
          items.map((virtualRow) => {
            const p = filtered[virtualRow.index]
            if (!p) return null
            const k = rowKey(p)
            const drafted = isPlayerDrafted(p)
            const queued = Boolean(isPlayerQueued?.(p))
            return (
              <div
                key={p.id ?? k}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                data-index={virtualRow.index}
              >
                <MemoSleeperRow
                  player={p}
                  rank={virtualRow.index + 1}
                  selected={selectedKey === k}
                  drafted={drafted}
                  queued={queued}
                  canDraft={canDraft}
                  canNominate={canNominate}
                  useAiAdp={useAiAdp}
                  draftSport={draftSport}
                  isCompareAnchor={compareKey === k}
                  rowHeight={rowHeight}
                  onSelect={() => onPlayerSelect(p)}
                  onCompareTap={() => onCompareTap(p)}
                  onAddToQueue={() => onAddToQueue(p)}
                  onDraftRequest={() => onDraftRequest(p)}
                  onNominateRequest={onNominateRequest ? () => onNominateRequest(p) : undefined}
                  testIdBase={`sleeper-pool-row-${virtualRow.index}`}
                />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
