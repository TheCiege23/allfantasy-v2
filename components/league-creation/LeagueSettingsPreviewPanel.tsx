'use client';

/**
 * Shows a summary of roster, scoring, player pool, and league defaults for the selected preset.
 * Updates when sport or preset (variant) changes; helps users confirm settings before creation.
 */
import type { LeagueCreationPresetPayload } from '@/hooks/useSportPreset';

export interface LeagueSettingsPreviewPanelProps {
  preset: LeagueCreationPresetPayload | null;
  sport: string;
  presetLabel?: string;
  className?: string;
}

export function LeagueSettingsPreviewPanel({
  preset,
  sport,
  presetLabel,
  className = '',
}: LeagueSettingsPreviewPanelProps) {
  if (!preset) return null;

  const rosterSlots = preset.roster?.starter_slots
    ? Object.entries(preset.roster.starter_slots)
        .filter(([, count]) => count > 0)
        .map(([slot, count]) => `${slot}: ${count}`)
        .join(', ')
    : preset.rosterTemplate?.slots
        ?.filter((s) => s.starterCount > 0)
        .map((s) => `${s.slotName}: ${s.starterCount}`)
        .join(', ') ?? '—';

  const scoringFormat = preset.scoring?.scoring_format ?? preset.scoringTemplate?.formatType ?? '—';
  const scoringName = preset.scoringTemplate?.name ?? scoringFormat;

  const playerPoolType =
    sport === 'SOCCER'
      ? 'Soccer players (GKP, DEF, MID, FWD)'
      : sport === 'NFL' && (presetLabel === 'IDP' || presetLabel === 'Dynasty IDP')
        ? 'NFL offensive + defensive (IDP)'
        : sport === 'NFL'
          ? 'NFL offensive + DST'
          : `${sport} players`;

  const leagueDefaults = [
    `Teams: ${preset.league?.default_team_count ?? '—'}`,
    `Playoffs: ${preset.league?.default_playoff_team_count ?? '—'} teams`,
    `Season: ${preset.league?.default_regular_season_length ?? '—'} ${preset.league?.default_matchup_unit ?? 'weeks'}`,
  ].join(' · ');

  const contextMessage =
    sport === 'SOCCER'
      ? 'Soccer is its own sport; roster and scoring are soccer-specific.'
      : sport === 'NFL' && (presetLabel === 'IDP' || presetLabel === 'Dynasty IDP')
        ? 'IDP is an NFL preset: offensive + defensive roster and scoring.'
        : null;

  return (
    <div
      className={`rounded-lg border border-purple-600/30 bg-black/30 p-4 text-sm ${className}`}
      role="region"
      aria-label="Preset summary"
    >
      <p className="font-medium text-purple-300 mb-2">Preset summary</p>
      {contextMessage && (
        <p className="text-white/70 text-xs mb-2 italic">{contextMessage}</p>
      )}
      <ul className="space-y-1.5 text-white/80">
        <li>
          <span className="text-white/60">Roster:</span> {rosterSlots || '—'}
          {preset.roster?.bench_slots != null && (
            <span className="text-white/60"> · Bench: {preset.roster.bench_slots}</span>
          )}
        </li>
        <li>
          <span className="text-white/60">Scoring:</span> {scoringName}
        </li>
        <li>
          <span className="text-white/60">Player pool:</span> {playerPoolType}
        </li>
        <li>
          <span className="text-white/60">League defaults:</span> {leagueDefaults}
        </li>
      </ul>
      <p className="mt-2 text-xs text-white/50">
        Roster and scoring above update when you change sport or preset. You can change league size and other options before creating.
      </p>
    </div>
  );
}
