import { prisma } from "@/lib/prisma"
import { hashIp, hashUserAgent } from "@/lib/identity/IdentityFingerprint"

export type IdentitySignalContext = "signup" | "login" | "league_join"

/**
 * Append-only capture — never upserts/overwrites. A user's IP/device legitimately
 * changes over time; keeping history lets DuplicateManagerRiskService correlate
 * across it instead of only ever seeing the most recent value.
 */
export async function recordIdentitySignal(input: {
  userId: string
  ip?: string | null
  userAgent?: string | null
  deviceId?: string | null
  context: IdentitySignalContext
  contextId?: string | null
}): Promise<void> {
  const ipHash = hashIp(input.ip)
  const userAgentHash = hashUserAgent(input.userAgent)
  const deviceId = input.deviceId?.trim() || null

  // Nothing usable to record — skip rather than write an empty row.
  if (!ipHash && !userAgentHash && !deviceId) return

  await prisma.identitySignal
    .create({
      data: {
        userId: input.userId,
        ipHash,
        userAgentHash,
        deviceId,
        context: input.context,
        contextId: input.contextId?.trim() || null,
      },
    })
    .catch((err: unknown) => {
      // Never let signal capture break the actual signup/login/join flow it's attached to.
      console.error("[identity-signal] record failed (non-fatal):", err)
    })
}
