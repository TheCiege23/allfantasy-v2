export function clampCareerTier(value: unknown, fallback = 1): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(1, Math.floor(n))
}

function readTierCandidate(raw: Record<string, unknown>): unknown {
  if (raw.requiredCareerTier != null) return raw.requiredCareerTier
  if (raw.leagueTier != null) return raw.leagueTier
  if (raw.careerTier != null) return raw.careerTier
  if (raw.minCareerTier != null) return raw.minCareerTier
  if (raw.tier != null) return raw.tier
  return null
}

export function extractLeagueCareerTier(scoringRules: unknown, fallbackTier: number): number {
  if (scoringRules == null || typeof scoringRules !== "object" || Array.isArray(scoringRules)) {
    return clampCareerTier(fallbackTier)
  }

  const raw = scoringRules as Record<string, unknown>
  const candidate = readTierCandidate(raw)
  return clampCareerTier(candidate, clampCareerTier(fallbackTier))
}

export function isLeagueVisibleForCareerTier(userTier: number, leagueTier: number, distance = 1): boolean {
  const safeUserTier = clampCareerTier(userTier)
  const safeLeagueTier = clampCareerTier(leagueTier)
  return Math.abs(safeUserTier - safeLeagueTier) <= Math.max(0, Math.floor(distance))
}

export async function resolveUserCareerTier(prismaLike: any, userId: string | null | undefined, fallback = 1): Promise<number> {
  if (!userId) return clampCareerTier(fallback)

  try {
    const row = await prismaLike.appUser.findUnique({
      where: { id: userId },
      select: {
        legacyUser: {
          select: {
            rankCache: {
              select: {
                careerTier: true,
              },
            },
          },
        },
      },
    })

    return clampCareerTier(row?.legacyUser?.rankCache?.careerTier, fallback)
  } catch {
    return clampCareerTier(fallback)
  }
}
