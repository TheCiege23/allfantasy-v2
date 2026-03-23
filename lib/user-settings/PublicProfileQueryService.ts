import { prisma } from "@/lib/prisma"
import type { PublicProfileDto } from "./types"

/**
 * Fetches public profile by username. Returns null if user not found.
 */
export async function getPublicProfileByUsername(
  username: string
): Promise<PublicProfileDto | null> {
  if (!username?.trim()) return null
  const trimmedUsername = username.trim()

  let user = await prisma.appUser.findUnique({
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
  if (!user && trimmedUsername !== trimmedUsername.toLowerCase()) {
    user = await prisma.appUser.findUnique({
      where: { username: trimmedUsername.toLowerCase() },
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
  }

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
