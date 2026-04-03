'use client'

import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { UserLeague } from '../types'
import { LeagueAvatar } from './LeagueAvatar'

type ConceptBadge = { label: string; className: string }

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

export type LeagueHubCardProps = {
  league: UserLeague
  onClick: () => void
}

export function LeagueHubCard({ league, onClick }: LeagueHubCardProps) {
  const router = useRouter()
  const formatBadge = getConceptBadge(league)
  const statusBadge = getLeagueStatusDisplay(league)
  const platformPill = getPlatformPill(league.platform)
  const sportLabel = (league.sport || 'NFL').toString().toUpperCase()
  const seasonLabel =
    league.season !== undefined && league.season !== null ? String(league.season) : '—'
  const scoringLabel = league.scoring || 'Standard'

  return (
    <button
      type="button"
      onClick={() => {
        onClick()
        router.push(`/league/${league.id}`)
      }}
      className="w-full rounded-2xl border border-white/[0.07] bg-[#0c0c1e] p-4 text-left transition-colors hover:border-white/15"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <LeagueAvatar league={league} size={40} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[15px] font-bold text-white">{league.name}</p>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-white/30" aria-hidden />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${platformPill.className}`}
            >
              {platformPill.label}
            </span>
            <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/55">
              {sportLabel}
            </span>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${formatBadge.className}`}
            >
              {formatBadge.label}
            </span>
            <span className="text-[11px] text-white/45">{scoringLabel}</span>
          </div>
          <p className="mt-1 text-[11px] text-white/35">
            {league.teamCount}-team · Season {seasonLabel}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-white/50">
          W-L —-—
        </span>
        <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-white/50">
          FAAB —
        </span>
        <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-white/50">
          Next: TBD
        </span>
      </div>
    </button>
  )
}
