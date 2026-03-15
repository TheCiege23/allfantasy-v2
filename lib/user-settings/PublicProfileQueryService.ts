import { prisma } from "@/lib/prisma"

/**
 * Public-facing profile DTO (no email, phone, or internal ids).
 * Used for /profile/[username] and shareable profile views.
 */
export interface PublicProfileDto {
  username: string
  displayName: string | null
  profileImageUrl: string | null
  avatarPreset: string | null
  bio: string | null
  preferredSports: string[] | null
}

/**
 * Fetches public profile by username. Returns null if user not found.
 */
export async function getPublicProfileByUsername(
  username: string
): Promise<PublicProfileDto | null> {
  if (!username?.trim()) return null

  const user = await prisma.appUser.findUnique({
    where: { username: username.trim() },
    select: {
      username: true,
      displayName: true,
      avatarUrl: true,
      profile: {
        select: {
          displayName: true,
          avatarPreset: true,
          bio: true,
          preferredSports: true,
        },
      },
    },
  })

  if (!user) return null

  const profile = user.profile
  const preferredSports =
    profile?.preferredSports != null
      ? Array.isArray(profile.preferredSports)
        ? (profile.preferredSports as string[])
        : [profile.preferredSports as string]
      : null

  return {
    username: user.username,
    displayName: profile?.displayName ?? user.displayName ?? null,
    profileImageUrl: user.avatarUrl ?? null,
    avatarPreset: profile?.avatarPreset ?? null,
    bio: profile?.bio ?? null,
    preferredSports,
  }
}
