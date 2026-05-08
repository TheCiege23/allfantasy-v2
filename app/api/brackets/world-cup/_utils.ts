import { getServerSession } from "next-auth"
import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { isAdminEmailAllowed, isAuthorizedRequest } from "@/lib/adminAuth"
import { prisma } from "@/lib/prisma"
import { resolveAuthSecret } from "@/lib/auth/resolve-auth-secret"
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

function serializeWorldCupAuthError(error: unknown) {
  const value = error as { name?: string; message?: string; code?: string }
  return {
    name: value?.name ?? "Error",
    message: value?.message ?? "Unknown error",
    code: typeof value?.code === "string" ? value.code : null,
  }
}

async function getWorldCupApiUserFromToken(request?: Request): Promise<WorldCupApiSessionUser | null> {
  if (!request) return null

  const secret = resolveAuthSecret()
  if (!secret) return null

  const token = (await getToken({ req: request as any, secret })) as {
    id?: string | null
    sub?: string | null
    email?: string | null
    name?: string | null
  } | null

  const id = token?.id ?? token?.sub
  if (!id) return null

  return {
    id,
    email: token?.email ?? null,
    name: token?.name ?? null,
  }
}

export async function getWorldCupApiUser(request?: Request): Promise<WorldCupApiSessionUser | null> {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string | null; email?: string | null; name?: string | null }
    } | null

    const id = session?.user?.id
    if (!id) {
      return await getWorldCupApiUserFromToken(request)
    }

    return {
      id,
      email: session?.user?.email ?? null,
      name: session?.user?.name ?? null,
    }
  } catch (error) {
    console.error("[world-cup/auth] getServerSession failed", serializeWorldCupAuthError(error))
    return await getWorldCupApiUserFromToken(request)
  }
}

export async function requireWorldCupApiUser(request?: Request) {
  const user = await getWorldCupApiUser(request)
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
