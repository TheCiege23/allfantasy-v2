import { SUPPORTED_SPORTS } from "@/lib/sport-scope"

const SPORT_LABELS: Record<string, string> = {
  NFL: "NFL",
  NHL: "NHL",
  NBA: "NBA",
  MLB: "MLB",
  NCAAF: "NCAA Football",
  NCAAB: "NCAA Basketball",
  SOCCER: "Soccer",
}

/**
 * Resolves sport code to display label for profile/settings UI.
 */
export function getSportLabel(code: string): string {
  return SPORT_LABELS[code] ?? code
}

/**
 * Returns all supported sports as { value, label } for selectors.
 */
export function getPreferredSportsOptions(): { value: string; label: string }[] {
  return SUPPORTED_SPORTS.map((s) => ({ value: s, label: getSportLabel(s) }))
}
