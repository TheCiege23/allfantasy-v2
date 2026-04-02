'use client'

import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { UserLeague } from '../types'

type HubLeague = UserLeague & { avatarUrl?: string | null }

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

function leagueAvatarSrc(league: HubLeague): string | null {
  const u = league.avatarUrl?.trim()
  if (!u) return null
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('/')) return u
  return `https://sleepercdn.com/avatars/${u}`
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return name.slice(0, 2).toUpperCase() || 'AF'
}

export type LeagueHubCardProps = {
  league: HubLeague
  onClick: () => void
}

export function LeagueHubCard({ league, onClick }: LeagueHubCardProps) {
  const router = useRouter()
  const badge = getConceptBadge(league)
  const src = leagueAvatarSrc(league)

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
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-white/10">
          {src ? (
            <img src={src} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-white/60">
              {initials(league.name)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[14px] font-semibold text-white">{league.name}</p>
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-white/30" aria-hidden />
          </div>
          <span
            className={`mt-1.5 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
          >
            {badge.label}
          </span>
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
