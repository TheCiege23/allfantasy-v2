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

  const sportUpper = String(sport || '').toUpperCase();
  const variantText = [presetLabel, preset.scoring?.scoring_format, preset.scoringTemplate?.formatType]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();
  const isSoccer = sportUpper === 'SOCCER';
  const isNflIdp = sportUpper === 'NFL' && variantText.includes('IDP');

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
    isSoccer
      ? 'Soccer players (GKP/GK, DEF, MID, FWD)'
      : isNflIdp
        ? 'NFL offensive + IDP defenders (DL, LB, DB, IDP FLEX)'
        : sportUpper === 'NFL'
          ? 'NFL offensive + DST'
          : `${sportUpper || 'Sport'} players`;

  const teamMetadata = preset.teamMetadata?.teams ?? [];
  const teamMetadataSamples = teamMetadata.slice(0, 6);

  const leagueDefaults = [
    `Teams: ${preset.league?.default_team_count ?? '—'}`,
    `Playoffs: ${preset.league?.default_playoff_team_count ?? '—'} teams`,
    `Season: ${preset.league?.default_regular_season_length ?? '—'} ${preset.league?.default_matchup_unit ?? 'weeks'}`,
  ].join(' · ');

  const contextMessage =
    isSoccer
      ? 'Soccer is a separate sport selection, so this preview uses soccer-specific roster slots, scoring, and player pools.'
      : isNflIdp
        ? 'IDP keeps NFL as the sport, but expands the preset to include defensive starters, defenders in the player pool, and IDP scoring.'
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
        {teamMetadata.length > 0 && (
          <li>
            <span className="text-white/60">Team metadata:</span> {teamMetadata.length} teams with logos
            <div className="mt-2 flex flex-wrap gap-2">
              {teamMetadataSamples.map((team) => (
                <span
                  key={`${team.team_id}-${team.abbreviation}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/75"
                  title={team.team_name}
                >
                  {team.primary_logo ? (
                    <img
                      src={team.primary_logo}
                      alt={`${team.abbreviation} logo`}
                      className="h-3.5 w-3.5 rounded-full object-contain"
                      loading="lazy"
                    />
                  ) : null}
                  <span>{team.abbreviation}</span>
                </span>
              ))}
            </div>
          </li>
        )}
      </ul>
      <p className="mt-2 text-xs text-white/50">
        Roster and scoring above update when you change sport or preset. You can change league size and other options before creating.
      </p>
    </div>
  );
}
