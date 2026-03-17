'use client'

import { useState } from 'react'
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
}

function HeadshotOrFallback({
  headshotUrl,
  displayName,
  size = 32,
  className = '',
}: {
  headshotUrl: string | null
  displayName: string
  size?: number
  className?: string
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
        className={`rounded-full object-cover bg-white/10 ${className}`}
        lazy
        onError={() => setImgError(true)}
      />
    )
  }
  return (
    <div
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
}: {
  logoUrl: string | null
  teamAbbr: string | null
  size?: number
  className?: string
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
        className={`rounded object-contain ${className}`}
        lazy
        onError={() => setImgError(true)}
      />
    )
  }
  return (
    <span
      className={`inline-flex items-center justify-center rounded bg-white/10 text-[10px] font-medium text-white/80 flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {teamAbbr ? teamAbbr.slice(0, 2).toUpperCase() : '—'}
    </span>
  )
}

export function DraftPlayerCard({
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
  isDevy = false,
  school = null,
  graduatedToNFL = false,
  poolType,
}: DraftPlayerCardProps) {
  const assets: PlayerAssetModel | null = display?.assets ?? null
  const teamAbbr = display?.metadata?.teamAbbreviation ?? team ?? null
  const displayName = display?.displayName ?? name
  const primaryStat = display?.stats?.primaryStatValue ?? adp
  const bye = display?.metadata?.byeWeek ?? display?.stats?.byeWeek ?? byeWeek
  const injuryStatus = display?.metadata?.injuryStatus ?? null
  const devyLabel = school ?? (isDevy ? 'Devy' : null)
  const showPromoted = graduatedToNFL
  const showProBadge = poolType === 'pro'
  const showCollegeBadge = poolType === 'college' || (isDevy && !showProBadge)

  if (loading) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-2 py-2 animate-pulse"
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

  if (variant === 'card') {
    return (
      <div
        data-draft-player-card="true"
        data-variant="card"
        className={`rounded-xl border bg-black/30 p-3 ${
          isDrafted ? 'border-white/5 opacity-75' : 'border-white/12'
        } ${isDevy ? 'ring-1 ring-inset ring-violet-500/30' : ''}`}
      >
        <div className="flex items-center gap-3">
          <HeadshotOrFallback headshotUrl={headshotUrl} displayName={displayName} size={40} />
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
              <TeamLogoOrFallback logoUrl={teamLogoUrl} teamAbbr={teamAbbr} size={18} />
              <span className="text-xs text-white/60">{position}</span>
              {teamAbbr && <span className="text-xs text-white/50">{teamAbbr}</span>}
              {primaryStat != null && (
                <span className="text-xs text-white/50">ADP {primaryStat}</span>
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
            <div className="flex shrink-0 gap-1">
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
      className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px] min-w-0 ${
        isDrafted ? 'border-white/5 bg-black/20 opacity-70' : 'border-white/10 bg-black/30 hover:border-white/20'
      } ${isDevy ? 'border-l-2 border-l-violet-500/50' : ''}`}
    >
      <HeadshotOrFallback headshotUrl={headshotUrl} displayName={displayName} size={28} />
      <TeamLogoOrFallback logoUrl={teamLogoUrl} teamAbbr={teamAbbr} size={18} />
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
          {showPromoted && (
            <span className="rounded bg-emerald-500/25 px-1 py-0.5 text-[9px] font-medium text-emerald-200 shrink-0" title="Promoted to NFL">
              Promoted
            </span>
          )}
        </div>
        <p className="text-[10px] text-white/55">
          {position} · {teamAbbr ?? (school ?? '—')} · ADP {primaryStat ?? '—'}
          {bye != null && bye > 0 ? ` · Bye ${bye}` : ''}
          {injuryStatus ? ` · ${injuryStatus}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        {secondaryAction}
        {primaryAction}
      </div>
    </li>
  )
}
