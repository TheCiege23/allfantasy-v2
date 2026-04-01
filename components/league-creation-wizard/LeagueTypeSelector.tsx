'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  LEAGUE_TYPE_IDS,
  LEAGUE_TYPE_LABELS,
  getAllowedLeagueTypesForSport,
} from '@/lib/league-creation-wizard/league-type-registry'
import { getLeagueTypeMedia } from '@/lib/league-media/leagueTypeMedia'
import type { LeagueTypeId } from '@/lib/league-creation-wizard/types'
import { StepHeader } from './StepHelp'

export type LeagueTypeSelectorProps = {
  sport: string
  value: LeagueTypeId
  onChange: (leagueType: LeagueTypeId) => void
}

const LEAGUE_TYPE_TOOLTIPS: Partial<Record<LeagueTypeId, string>> = {
  redraft: 'One season; redraft every year. Most common.',
  dynasty: 'Keep your full roster year to year; rookie drafts each season.',
  keeper: 'Keep a set number of players each season.',
  best_ball: 'No lineup setting; best scoring lineup counts each week.',
  devy: 'Draft and hold college players with dedicated devy rosters; supports football and basketball ecosystems.',
  c2c: 'Campus to Canton: college + pro assets in one league with live college scoring; supports football and basketball ecosystems.',
  guillotine: 'Lowest scorer each week is eliminated.',
  survivor: 'Similar to guillotine; elimination-style.',
  tournament: 'Bracket or tournament format.',
  zombie: 'Eliminated teams can return under certain rules.',
  salary_cap: 'Salary cap and contracts.',
}

const LEAGUE_TYPE_BADGES: Partial<Record<LeagueTypeId, 'POPULAR' | 'NEW'>> = {
  redraft: 'POPULAR',
  salary_cap: 'NEW',
}

/**
 * League type selection (redraft, dynasty, keeper, etc.). Options filtered by sport.
 */
export function LeagueTypeSelector({ sport, value, onChange }: LeagueTypeSelectorProps) {
  const allowed = getAllowedLeagueTypesForSport(sport)
  const safeValue = allowed.includes(value) ? value : allowed[0]!
  const selectedMedia = getLeagueTypeMedia(safeValue)
  const [showPreview, setShowPreview] = useState(false)

  return (
    <div className="space-y-6">
      <StepHeader
        title="Choose League Type"
        description="You can change this later in settings (except where league rules lock the choice)."
        help={
          <>
            <strong>Redraft</strong> — New draft every season. <strong>Dynasty</strong> — Keep full roster; add rookies each year. <strong>Keeper</strong> — Keep a few players. <strong>Devy/C2C</strong> — Include college players and college scoring where supported (football and basketball ecosystems).
          </>
        }
        helpTitle="League type explained"
      />

      <div className="space-y-3">
        <Label className="text-cyan-300">Type</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {LEAGUE_TYPE_IDS.filter((id) => allowed.includes(id)).map((id) => {
            const media = getLeagueTypeMedia(id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange(id)}
                className={`group relative overflow-hidden rounded-2xl border text-left transition ${
                  safeValue === id
                    ? 'border-cyan-300 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(0,255,220,0.2)_inset]'
                    : 'border-white/15 bg-black/25 hover:bg-white/[0.05]'
                }`}
                title={LEAGUE_TYPE_TOOLTIPS[id]}
              >
                {LEAGUE_TYPE_BADGES[id] && (
                  <span className="absolute left-2 top-2 z-10 rounded-md bg-[#00ffd4] px-1.5 py-0.5 text-[10px] font-black tracking-[0.08em] text-[#021827]">
                    {LEAGUE_TYPE_BADGES[id]}
                  </span>
                )}
                <img
                  src={media.thumbnail}
                  alt={`${LEAGUE_TYPE_LABELS[id]} thumbnail`}
                  className="h-28 w-full object-cover opacity-75"
                  onError={(event) => {
                    event.currentTarget.src = media.thumbnailFallback
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="text-sm font-semibold text-white">{LEAGUE_TYPE_LABELS[id]}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-400/25 bg-[#07122d]/80 p-3">
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-left"
          aria-expanded={showPreview}
        >
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-200/80">Selected league type preview</p>
            <p className="mt-1 text-sm text-white/85">{LEAGUE_TYPE_LABELS[safeValue]}</p>
          </div>
          {showPreview ? (
            <ChevronDown className="size-4 text-cyan-200/80" aria-hidden />
          ) : (
            <ChevronRight className="size-4 text-cyan-200/80" aria-hidden />
          )}
        </button>
        {showPreview && (
          <>
            <video
              key={selectedMedia.selectionVideo}
              className="mt-3 h-44 w-full rounded-xl border border-white/15 bg-black object-cover"
              src={selectedMedia.selectionVideo}
              poster={selectedMedia.thumbnail}
              autoPlay
              loop
              muted
              playsInline
              controls
              onError={(event) => {
                const target = event.currentTarget
                target.poster = selectedMedia.thumbnailFallback
                target.removeAttribute('src')
                target.load()
              }}
            />
            <p className="mt-2 text-xs text-white/60">
              The intro video (when available) will play on league entry; this preview is optional during setup.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
