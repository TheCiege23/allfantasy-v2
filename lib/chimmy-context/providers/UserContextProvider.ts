/**
 * Phase 2A — UserContextProvider
 * Pulls the canonical AppUser + UserProfile fields needed for AI personalization.
 * Never leaks email; uses `resolveDisplayName` to enforce that rule.
 */

import { prisma } from "@/lib/prisma"
import { resolveDisplayName } from "@/lib/dashboard/resolve-display-name"
import type {
  ChimmyContextProvider,
  ChimmyContextRequest,
  ProviderResult,
  UserContextSlice,
} from "@/lib/chimmy-context/types"

export class UserContextProvider implements ChimmyContextProvider<UserContextSlice> {
  readonly name = "user"
  readonly defaultTtlMs = 5 * 60 * 1000

  async load(request: ChimmyContextRequest): Promise<ProviderResult<UserContextSlice>> {
    const startedAt = Date.now()
    const fetchedAt = new Date().toISOString()
    try {
      const [appUser, profile] = await Promise.all([
        prisma.appUser.findUnique({
          where: { id: request.userId },
          select: { id: true, username: true, createdAt: true },
        }),
        prisma.userProfile.findUnique({
          where: { userId: request.userId },
          select: { displayName: true, timezone: true, preferredLanguage: true },
        }),
      ])

      const displayName = resolveDisplayName({
        displayName: profile?.displayName,
        username: appUser?.username,
        sessionName: null,
        email: null,
      })

      const slice: UserContextSlice = {
        userId: request.userId,
        displayName,
        username: appUser?.username ?? null,
        timezone: profile?.timezone ?? null,
        preferredLanguage: profile?.preferredLanguage ?? null,
        createdAt: appUser?.createdAt ? appUser.createdAt.toISOString() : null,
      }

      return {
        ok: true,
        data: slice,
        fetchedAt,
        durationMs: Date.now() - startedAt,
      }
    } catch (err) {
      return {
        ok: false,
        data: null,
        error: err instanceof Error ? err.message : "Unknown user provider error",
        fetchedAt,
        durationMs: Date.now() - startedAt,
      }
    }
  }
}
