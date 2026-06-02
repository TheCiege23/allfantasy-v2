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
 * Resolves profile (own or public) to a consistent presentation.
 * The canonical AppUser.username is the prominent identity label because it is
 * also the username accepted at login and used for mentions.
 */
export function resolveProfilePresentation(
  profile: UserProfileForSettings | PublicProfileDto | null
): ProfilePresentation | null {
  if (!profile) return null
  const username =
    (profile as UserProfileForSettings).username ??
    (profile as PublicProfileDto).username ??
    "-"
  const displayName = username || profile.displayName || "-"
  const preferredSports = profile.preferredSports ?? []
  return {
    displayName,
    username,
    initial: (displayName || username || "?").charAt(0).toUpperCase(),
    bio: profile.bio ?? null,
    preferredSportsLabels: preferredSports.map(getSportLabel),
  }
}
