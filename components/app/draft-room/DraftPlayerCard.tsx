'use client'

import React, { useState } from 'react'
import type { PlayerDisplayModel, PlayerAssetModel } from '@/lib/draft-sports-models/types'
import { LazyDraftImage } from './LazyDraftImage'

export type DraftPlayerCardProps = {
  /** Normalized display model (preferred) */
  display?: PlayerDisplayModel | null
  /** Fallback when display not provided: minimal fields for list row */
  name: string
  position: string
  team?: string | null
  adp?: number | null
  byeWeek?: number | null
  /** Draft state */
  isDrafted?: boolean
  /** Show compact row (list) vs larger card */
  variant?: 'row' | 'card'
  /** Devy: from college/devy pool */
  isDevy?: boolean
  /** Devy: school (e.g. "Ohio State") */
  school?: string | null
  classYearLabel?: string | null
  draftGrade?: string | null
  projectedLandingSpot?: string | null
  /** Devy: promoted to NFL */
  graduatedToNFL?: boolean
  /** C2C: 'college' | 'pro' for Campus-to-Canton */
  poolType?: 'college' | 'pro'
  /** Optional: primary action (e.g. Draft button) */
  primaryAction?: React.ReactNode
  /** Optional: secondary action (e.g. Add to queue) */
  secondaryAction?: React.ReactNode
  /** Loading state */
  loading?: boolean
  /** Error state (e.g. failed to load asset) */
  error?: string | null
  /** Optional card click handler for player detail drill-down. */
  onSelect?: () => void
  /** Optional explicit test id */
  testId?: string
}

function HeadshotOrFallback({
  headshotUrl,
  displayName,
  size = 32,
  className = '',
  testIdBase = 'draft-player-headshot',
}: {
  headshotUrl: string | null
  displayName: string
  size?: number
  className?: string
  testIdBase?: string
}) {
  const [imgError, setImgError] = useState(false)
  const showImg = headshotUrl && !imgError

  if (showImg) {
    return (
      <LazyDraftImage
        src={headshotUrl}
        alt=""
        width={size}
        height={size}
        testId={`${testIdBase}-image`}
        className={`rounded-full object-cover bg-white/10 ${className}`}
        lazy
        onError={() => setImgError(true)}
      />
    )
  }
  return (
    <div
      data-testid={`${testIdBase}-fallback`}
      className={`rounded-full bg-white/15 flex items-center justify-center text-white/70 font-semibold flex-shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
      aria-hidden
    >
      {displayName ? displayName.charAt(0).toUpperCase() : '?'}
    </div>
  )
}

function TeamLogoOrFallback({
  logoUrl,
  teamAbbr,
  size = 20,
  className = '',
  testIdBase = 'draft-player-team-logo',
}: {
  logoUrl: string | null
  teamAbbr: string | null
  size?: number
  className?: string
  testIdBase?: string
}) {
  const [imgError, setImgError] = useState(false)
  const showImg = logoUrl && !imgError

  if (showImg) {
    return (
      <LazyDraftImage
        src={logoUrl}
        alt={teamAbbr ?? ''}
        width={size}
        height={size}
        testId={`${testIdBase}-image`}
        className={`rounded object-contain ${className}`}
        lazy
        onError={() => setImgError(true)}
      />
    )
  }
  return (
    <span
      data-testid={`${testIdBase}-fallback`}
      className={`inline-flex items-center justify-center rounded bg-white/10 text-[10px] font-medium text-white/80 flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {teamAbbr ? teamAbbr.slice(0, 2).toUpperCase() : '—'}
    </span>
  )
}

function DraftPlayerCardInner({
  display,
  name,
  position,
  team,
  adp,
  byeWeek,
  isDrafted = false,
  variant = 'row',
  primaryAction,
  secondaryAction,
  loading = false,
  error = null,
  onSelect,
  testId,
  isDevy = false,
  school = null,
  classYearLabel = null,
  draftGrade = null,
  projectedLandingSpot = null,
  graduatedToNFL = false,
  poolType,
}: DraftPlayerCardProps) {
  const assets: PlayerAssetModel | null = display?.assets ?? null
  const teamAbbr = display?.metadata?.teamAbbreviation ?? team ?? null
  const displayName = display?.displayName ?? name
  const primaryStat = display?.stats?.primaryStatValue ?? adp
  const bye = display?.metadata?.byeWeek ?? display?.stats?.byeWeek ?? byeWeek
  const injuryStatus = display?.metadata?.injuryStatus ?? null
  const resolvedSchool = school ?? display?.metadata?.collegeOrPipeline ?? null
  const resolvedClassYearLabel = display?.metadata?.classYearLabel ?? classYearLabel
  const resolvedDraftGrade = display?.metadata?.draftGrade ?? draftGrade
  const resolvedProjectedLandingSpot = display?.metadata?.projectedLandingSpot ?? projectedLandingSpot
  const devyLabel = resolvedSchool ?? (isDevy ? 'Devy' : null)
  const showPromoted = graduatedToNFL
  const showProBadge = poolType === 'pro'
  const showCollegeBadge = poolType === 'college' || (isDevy && !showProBadge)

  if (loading) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0a1228] px-2 py-2 animate-pulse"
        aria-busy="true"
      >
        <div className="h-8 w-8 rounded-full bg-white/10" />
        <div className="flex-1 space-y-1">
          <div className="h-3 w-12 bg-white/10 rounded" />
          <div className="h-2 w-24 bg-white/10 rounded" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-2 text-xs text-amber-200">
        {error}
      </div>
    )
  }

  const headshotUrl = assets?.headshotUrl ?? null
  const teamLogoUrl = assets?.teamLogoUrl ?? null
  const headshotTestBase = testId ? `${testId}-headshot` : 'draft-player-headshot'
  const teamLogoTestBase = testId ? `${testId}-team-logo` : 'draft-player-team-logo'

  if (variant === 'card') {
    return (
      <div
        data-draft-player-card="true"
        data-variant="card"
        data-drafted={isDrafted ? 'true' : 'false'}
        data-testid={testId}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSelect?.()
        }}
        role={onSelect ? 'button' : undefined}
        tabIndex={onSelect ? 0 : undefined}
        className={`rounded-xl border bg-[#0a1228] p-3 ${
          isDrafted ? 'border-white/5 opacity-75' : 'border-white/12'
        } ${isDevy ? 'ring-1 ring-inset ring-violet-500/30' : ''}`}
      >
        <div className="flex items-center gap-3">
          <HeadshotOrFallback
            headshotUrl={headshotUrl}
            displayName={displayName}
            size={40}
            testIdBase={headshotTestBase}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-medium text-white truncate">{displayName}</p>
              {devyLabel && (
                <span className="rounded bg-violet-500/25 px-1.5 py-0.5 text-[10px] font-medium text-violet-200" title="Devy / college">
                  {devyLabel}
                </span>
              )}
              {showPromoted && (
                <span className="rounded bg-emerald-500/25 px-1.5 py-0.5 text-[10px] font-medium text-emerald-200" title="Promoted to NFL">
                  Promoted
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <TeamLogoOrFallback
                logoUrl={teamLogoUrl}
                teamAbbr={teamAbbr}
                size={18}
                testIdBase={teamLogoTestBase}
              />
              <span className="text-xs text-white/60">{position}</span>
              {teamAbbr && <span className="text-xs text-white/50">{teamAbbr}</span>}
              {resolvedClassYearLabel && (
                <span className="text-xs text-white/50">{resolvedClassYearLabel}</span>
              )}
              {primaryStat != null && (
                <span className="text-xs text-white/50">ADP {primaryStat}</span>
              )}
              {resolvedDraftGrade && (
                <span className="text-xs text-white/50">Grade {resolvedDraftGrade}</span>
              )}
              {bye != null && bye > 0 && (
                <span className="text-xs text-white/50">Bye {bye}</span>
              )}
              {injuryStatus && (
                <span className="text-[10px] text-amber-400" title={injuryStatus}>
                  {injuryStatus}
                </span>
              )}
            </div>
          </div>
          {(primaryAction || secondaryAction) && (
            <div
              className="flex shrink-0 gap-1"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {secondaryAction}
              {primaryAction}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <li
      data-draft-player-card="true"
      data-variant="row"
      data-drafted={isDrafted ? 'true' : 'false'}
      data-testid={testId}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onSelect?.()
      }}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px] min-w-0 ${
        isDrafted ? 'border-white/5 bg-[#0a1228]/70 opacity-70' : 'border-white/10 bg-[#0a1228] hover:border-white/20'
      } ${isDevy ? 'border-l-2 border-l-violet-500/50' : ''}`}
    >
      <HeadshotOrFallback
        headshotUrl={headshotUrl}
        displayName={displayName}
        size={28}
        testIdBase={headshotTestBase}
      />
      <TeamLogoOrFallback
        logoUrl={teamLogoUrl}
        teamAbbr={teamAbbr}
        size={18}
        testIdBase={teamLogoTestBase}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="truncate font-medium text-white">{displayName}</p>
          {showProBadge && (
            <span className="rounded bg-cyan-500/25 px-1 py-0.5 text-[9px] font-medium text-cyan-200 shrink-0" title="Pro / NFL">
              Pro
            </span>
          )}
          {(showCollegeBadge && devyLabel) && (
            <span className="rounded bg-violet-500/25 px-1 py-0.5 text-[9px] font-medium text-violet-200 shrink-0" title="College / devy">
              {devyLabel}
            </span>
          )}
          {resolvedDraftGrade && (
            <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-medium text-amber-100 shrink-0" title="Draft grade">
              {resolvedDraftGrade}
            </span>
          )}
          {showPromoted && (
            <span className="rounded bg-emerald-500/25 px-1 py-0.5 text-[9px] font-medium text-emerald-200 shrink-0" title="Promoted to NFL">
              Promoted
            </span>
          )}
        </div>
        <p className="text-[10px] text-white/55">
          {position} · {teamAbbr ?? (resolvedSchool ?? '—')} · ADP {primaryStat ?? '—'}
          {resolvedClassYearLabel ? ` · ${resolvedClassYearLabel}` : ''}
          {resolvedProjectedLandingSpot ? ` · ${resolvedProjectedLandingSpot}` : ''}
          {bye != null && bye > 0 ? ` · Bye ${bye}` : ''}
          {injuryStatus ? ` · ${injuryStatus}` : ''}
        </p>
      </div>
      <div
        className="flex shrink-0 gap-1"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {secondaryAction}
        {primaryAction}
      </div>
    </li>
  )
}

export const DraftPlayerCard = React.memo(DraftPlayerCardInner)
