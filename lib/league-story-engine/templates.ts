/**
 * League Story Engine — narrative templates per story type.
 * Placeholders: {leagueName}, {week}, {team1}, {team2}, {teamName}, {highlight}.
 */

import type { LeagueStoryType } from './types'

export const STORY_TITLES: Record<LeagueStoryType, string> = {
  closest_matchup: 'The closest matchup of the week',
  underdog_story: 'Underdog story',
  dominant_team: 'Dominant team',
  rivalry_spotlight: 'Rivalry of the week',
  comeback_trajectory: "Don't count them out",
  league_spotlight: 'League spotlight',
}

export const STORY_TEMPLATES: Record<LeagueStoryType, string> = {
  closest_matchup:
    'This is the closest matchup of the week. {team1} and {team2} are neck and neck — every lineup decision could swing it.',
  underdog_story:
    'Underdog story: {team1} is facing long odds against {team2}. But in fantasy, anything can happen. One big game could flip the script.',
  dominant_team:
    'Dominant team: {teamName} is running away with it in {leagueName}. The rest of the league is playing for second — for now.',
  rivalry_spotlight:
    'Rivalry of the week: {team1} vs {team2}. Bragging rights and playoff implications on the line.',
  comeback_trajectory:
    "Don't count them out. {teamName} started slow but is trending up. The second half could tell a different story.",
  league_spotlight:
    '{leagueName} — where every week brings new twists. Stay locked in for the playoff push.',
}

export function fillTemplate(
  template: string,
  vars: Record<string, string | number | undefined>
): string {
  let out = template
  for (const [key, value] of Object.entries(vars)) {
    const placeholder = new RegExp(`\\{${key}\\}`, 'g')
    out = out.replace(placeholder, String(value ?? ''))
  }
  return out
}
