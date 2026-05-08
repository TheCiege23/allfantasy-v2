import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { isAdminEmailAllowed, isAuthorizedRequest } from "@/lib/adminAuth"
import { prisma } from "@/lib/prisma"
import { userCanManageWorldCupChallenge } from "@/lib/world-cup"

export const worldCupChallengeParamsSchema = z.object({
  challengeId: z.string().min(1),
})

export const worldCupEntryParamsSchema = z.object({
  challengeId: z.string().min(1),
  entryId: z.string().min(1),
})

export const worldCupInviteParamsSchema = z.object({
  inviteCode: z.string().min(4).max(64),
})

export type WorldCupApiSessionUser = {
  id: string
  email?: string | null
  name?: string | null
}

export async function getWorldCupApiUser(): Promise<WorldCupApiSessionUser | null> {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string | null; email?: string | null; name?: string | null }
  } | null

  const id = session?.user?.id
  if (!id) return null

  return {
    id,
    email: session?.user?.email ?? null,
    name: session?.user?.name ?? null,
  }
}

export async function requireWorldCupApiUser() {
  const user = await getWorldCupApiUser()
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }),
    }
  }

  return { ok: true as const, user }
}

export async function getWorldCupAdminState(request: Request, user?: WorldCupApiSessionUser | null) {
  return Boolean(isAuthorizedRequest(request) || isAdminEmailAllowed(user?.email))
}

export async function assertWorldCupManager(
  request: Request,
  challengeId: string,
  user: WorldCupApiSessionUser
) {
  const challenge = await (prisma as any).worldCupBracketChallenge.findUnique({
    where: { id: challengeId },
    select: { id: true, ownerUserId: true },
  })

  if (!challenge) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Challenge not found" }, { status: 404 }),
    }
  }

  const isAdmin = await getWorldCupAdminState(request, user)
  const allowed = userCanManageWorldCupChallenge({
    userId: user.id,
    userEmail: user.email,
    ownerUserId: challenge.ownerUserId,
    isAdmin,
  })

  if (!allowed) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  return { ok: true as const, challenge, isAdmin }
}
