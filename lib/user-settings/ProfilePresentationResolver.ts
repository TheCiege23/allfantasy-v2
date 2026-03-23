import { getSportLabel } from "./PreferredSportsResolver"
import type { PublicProfileDto, UserProfileForSettings } from "./types"

export interface ProfilePresentation {
  displayName: string
  username: string
  initial: string
  bio: string | null
  preferredSportsLabels: string[]
}

/**
 * Resolves profile (own or public) to a consistent presentation for display.
 */
export function resolveProfilePresentation(
  profile: UserProfileForSettings | PublicProfileDto | null
): ProfilePresentation | null {
  if (!profile) return null
  const displayName = profile.displayName ?? (profile as PublicProfileDto).username ?? "—"
  const username = (profile as UserProfileForSettings).username ?? (profile as PublicProfileDto).username ?? "—"
  const preferredSports = profile.preferredSports ?? []
  return {
    displayName,
    username,
    initial: (displayName || username || "?").charAt(0).toUpperCase(),
    bio: profile.bio ?? null,
    preferredSportsLabels: preferredSports.map(getSportLabel),
  }
}
