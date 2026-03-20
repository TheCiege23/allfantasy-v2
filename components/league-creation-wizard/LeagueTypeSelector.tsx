'use client'

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
  devy: 'Draft college players (devy) in addition to NFL; NFL/NCAAF only.',
  c2c: 'Campus to Canton: college + NFL in one league; NFL/NCAAF only.',
  guillotine: 'Lowest scorer each week is eliminated.',
  survivor: 'Similar to guillotine; elimination-style.',
  tournament: 'Bracket or tournament format.',
  zombie: 'Eliminated teams can return under certain rules.',
  salary_cap: 'Salary cap and contracts.',
}

/**
 * League type selection (redraft, dynasty, keeper, etc.). Options filtered by sport.
 */
export function LeagueTypeSelector({ sport, value, onChange }: LeagueTypeSelectorProps) {
  const allowed = getAllowedLeagueTypesForSport(sport)
  const safeValue = allowed.includes(value) ? value : allowed[0]!
  const selectedMedia = getLeagueTypeMedia(safeValue)

  return (
    <div className="space-y-5">
      <StepHeader
        title="League type"
        description="Redraft is the most common: one season, then a new draft next year. Dynasty and keeper let you keep players."
        help={
          <>
            <strong>Redraft</strong> — New draft every season. <strong>Dynasty</strong> — Keep full roster; add rookies each year. <strong>Keeper</strong> — Keep a few players. <strong>Devy/C2C</strong> — Include college players (NFL/NCAAF).
          </>
        }
        helpTitle="League type explained"
      />

      <div className="space-y-3">
        <Label className="text-white/90">Type</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {LEAGUE_TYPE_IDS.filter((id) => allowed.includes(id)).map((id) => {
            const media = getLeagueTypeMedia(id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange(id)}
                className={`group relative overflow-hidden rounded-xl border text-left transition ${
                  safeValue === id
                    ? 'border-cyan-400/40 bg-cyan-400/10'
                    : 'border-white/15 bg-black/25 hover:bg-white/[0.05]'
                }`}
                title={LEAGUE_TYPE_TOOLTIPS[id]}
              >
                <img
                  src={media.thumbnail}
                  alt={`${LEAGUE_TYPE_LABELS[id]} thumbnail`}
                  className="h-20 w-full object-cover opacity-75"
                  onError={(event) => {
                    event.currentTarget.src = media.thumbnailFallback
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-2">
                  <p className="text-sm font-semibold text-white">{LEAGUE_TYPE_LABELS[id]}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-white/15 bg-black/30 p-3">
        <p className="text-xs uppercase tracking-[0.14em] text-white/65">Selected league type preview</p>
        <p className="mt-1 text-sm text-white/85">{LEAGUE_TYPE_LABELS[safeValue]}</p>
        <video
          key={selectedMedia.selectionVideo}
          className="mt-3 h-44 w-full rounded-lg border border-white/10 bg-black object-cover"
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
        <p className="mt-2 text-xs text-white/60">The intro video (when available) will play on league entry; this preview is the commissioner selection video.</p>
      </div>
    </div>
  )
}
