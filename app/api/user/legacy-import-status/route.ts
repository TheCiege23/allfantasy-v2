import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const LEGACY_PROVIDER_IDS = ["sleeper", "yahoo", "espn", "mfl", "fleaflicker", "fantrax"] as const

/**
 * GET /api/user/legacy-import-status
 * Returns legacy import provider status for the current user (Sleeper from profile + import job; others placeholder).
 */
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const profile = await (prisma as any).userProfile.findUnique({
    where: { userId: session.user.id },
    select: { sleeperUsername: true, sleeperLinkedAt: true, sleeperVerifiedAt: true },
  }).catch(() => null)

  const sleeperUsername = profile?.sleeperUsername?.trim().toLowerCase() ?? null
  const sleeperLinked = !!sleeperUsername

  let sleeperImportStatus: { status: string; progress?: number; lastJobAt?: string; error?: string } | null = null
  if (sleeperUsername) {
    const legacyUser = await (prisma as any).legacyUser.findUnique({
      where: { sleeperUsername },
      select: { id: true },
    }).catch(() => null)

    if (legacyUser) {
      const lastJob = await (prisma as any).legacyImportJob.findFirst({
        where: { userId: legacyUser.id },
        orderBy: { createdAt: "desc" },
        select: { status: true, progress: true, completedAt: true, error: true },
      }).catch(() => null)

      if (lastJob) {
        sleeperImportStatus = {
          status: lastJob.status,
          progress: lastJob.progress ?? undefined,
          lastJobAt: lastJob.completedAt ? new Date(lastJob.completedAt).toISOString() : undefined,
          error: lastJob.error ?? undefined,
        }
      } else {
        sleeperImportStatus = { status: "none" }
      }
    } else {
      sleeperImportStatus = { status: "not_started" }
    }
  }

  const providers: Record<string, { linked: boolean; importStatus: string | null; lastJobAt?: string; error?: string; available: boolean }> = {}
  providers.sleeper = {
    linked: sleeperLinked,
    importStatus: sleeperImportStatus?.status ?? null,
    lastJobAt: sleeperImportStatus?.lastJobAt,
    error: sleeperImportStatus?.error,
    available: true,
  }
  for (const id of LEGACY_PROVIDER_IDS) {
    if (id === "sleeper") continue
    providers[id] = { linked: false, importStatus: null, available: false }
  }

  return NextResponse.json({
    sleeperUsername: sleeperUsername ? `@${sleeperUsername}` : null,
    providers,
  })
}
