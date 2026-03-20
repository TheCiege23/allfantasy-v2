'use client';

import { Label } from '@/components/ui/label';

export type LeagueSportOption = 'NFL' | 'NBA' | 'MLB' | 'NHL' | 'NCAAF' | 'NCAAB' | 'SOCCER';

const SPORT_LABELS: Record<LeagueSportOption, string> = {
  NFL: 'NFL Football',
  NBA: 'NBA Basketball',
  MLB: 'MLB Baseball',
  NHL: 'NHL Hockey',
  NCAAF: 'NCAA Football',
  NCAAB: 'NCAA Basketball',
  SOCCER: 'Soccer',
};

const LEAGUE_SPORTS: LeagueSportOption[] = ['NFL', 'NHL', 'MLB', 'NBA', 'NCAAF', 'NCAAB', 'SOCCER'];

const SPORT_EMOJI: Record<LeagueSportOption, string> = {
  NFL: '🏈',
  NBA: '🏀',
  MLB: '⚾',
  NHL: '🏒',
  NCAAF: '🏈',
  NCAAB: '🏀',
  SOCCER: '⚽',
};

const SPORT_MEDIA: Record<LeagueSportOption, { image: string; video: string; thumbFallback: string }> = {
  NFL: { image: '/Football.png', video: '/Football.mp4', thumbFallback: '/af-crest.png' },
  NBA: { image: '/Basketball.png', video: '/Basketball.mp4', thumbFallback: '/af-crest.png' },
  MLB: { image: '/Baseball.png', video: '/Baseball.mp4', thumbFallback: '/af-crest.png' },
  NHL: { image: '/Hockey.png', video: '/Hockey.mp4', thumbFallback: '/af-crest.png' },
  NCAAF: { image: '/Football.png', video: '/Football.mp4', thumbFallback: '/af-crest.png' },
  NCAAB: { image: '/Basketball.png', video: '/Basketball.mp4', thumbFallback: '/af-crest.png' },
  SOCCER: { image: '/Soccer.png', video: '/Soccer.mp4', thumbFallback: '/af-crest.png' },
};

export interface LeagueCreationSportSelectorProps {
  value: LeagueSportOption;
  onChange: (sport: LeagueSportOption) => void;
  disabled?: boolean;
  showHelper?: boolean;
}

/**
 * Sport selector for league creation. Soccer is its own sport; NFL has presets (e.g. IDP) chosen separately.
 */
export function LeagueCreationSportSelector({
  value,
  onChange,
  disabled = false,
  showHelper = true,
}: LeagueCreationSportSelectorProps) {
  const selectedMedia = SPORT_MEDIA[value];
  return (
    <div className="space-y-3">
      <Label>Sport</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {LEAGUE_SPORTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            disabled={disabled}
            className={`group relative overflow-hidden rounded-xl border text-left transition ${
              value === s
                ? 'border-cyan-400/40 bg-cyan-400/10'
                : 'border-white/15 bg-black/25 hover:bg-white/[0.05]'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <img
              src={SPORT_MEDIA[s].image}
              alt={`${SPORT_LABELS[s]} thumbnail`}
              className="h-20 w-full object-cover opacity-75"
              onError={(event) => {
                event.currentTarget.src = SPORT_MEDIA[s].thumbFallback;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-2">
              <p className="text-xs uppercase tracking-[0.14em] text-white/75">{SPORT_EMOJI[s]} {s}</p>
              <p className="text-sm font-semibold text-white">{SPORT_LABELS[s]}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/15 bg-black/30 p-3">
        <p className="text-xs uppercase tracking-[0.14em] text-white/65">Selected sport preview</p>
        <p className="mt-1 text-sm text-white/85">{SPORT_LABELS[value]}</p>
        <video
          key={selectedMedia.video}
          className="mt-3 h-44 w-full rounded-lg border border-white/10 bg-black object-cover"
          src={selectedMedia.video}
          poster={selectedMedia.image}
          autoPlay
          loop
          muted
          playsInline
          controls
          onError={(event) => {
            const target = event.currentTarget;
            target.poster = selectedMedia.thumbFallback;
            target.removeAttribute('src');
            target.load();
          }}
        />
      </div>

      {showHelper && (
        <p className="text-white/50 text-xs mt-1">
          <strong className="text-white/70">Soccer</strong> is its own sport with its own roster and scoring. <strong className="text-white/70">IDP</strong> is an NFL preset — choose NFL, then pick a preset below such as Standard, PPR, Superflex, IDP, or Dynasty IDP. Selecting a preset updates roster and scoring automatically.
        </p>
      )}
    </div>
  );
}

export { LEAGUE_SPORTS, SPORT_LABELS };
