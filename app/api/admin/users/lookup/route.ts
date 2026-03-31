import { NextResponse } from "next/server"

import { requireAdminOrBearer } from "@/lib/adminAuth"
import { prisma } from "@/lib/prisma"
import { logAdminAudit } from "@/lib/admin-audit"

export const dynamic = "force-dynamic"

function pickAdminActor(user: { id?: string; email?: string; role?: string } | undefined) {
  return user?.id || user?.email || user?.role || "admin"
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export async function GET(request: Request) {
  const gate = await requireAdminOrBearer(request)
  if (!gate.ok) return gate.res

  const url = new URL(request.url)
  const email = url.searchParams.get("email")?.trim().toLowerCase() || ""
  const username = url.searchParams.get("username")?.trim() || ""
  const sleeperUsername = url.searchParams.get("sleeperUsername")?.trim() || username

  if (!email && !username && !sleeperUsername) {
    return NextResponse.json(
      { error: "Provide email, username, or sleeperUsername" },
      { status: 400 }
    )
  }

  try {
    const users = await (prisma as any).appUser.findMany({
      where: {
        OR: [
          ...(email ? [{ email: { equals: email, mode: "insensitive" } }] : []),
          ...(username ? [{ username: { equals: username, mode: "insensitive" } }] : []),
        ],
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
      take: 10,
    })

    const userIds = users.map((user: { id: string }) => user.id)
    const profiles = userIds.length
      ? await (prisma as any).userProfile.findMany({
          where: {
            OR: [
              { userId: { in: userIds } },
              ...(sleeperUsername
                ? [{ sleeperUsername: { equals: sleeperUsername, mode: "insensitive" } }]
                : []),
            ],
          },
          select: {
            userId: true,
            sleeperUsername: true,
            emailVerifiedAt: true,
            phoneVerifiedAt: true,
            verificationMethod: true,
            profileComplete: true,
          },
        })
      : await (prisma as any).userProfile.findMany({
          where: sleeperUsername
            ? { sleeperUsername: { equals: sleeperUsername, mode: "insensitive" } }
            : undefined,
          select: {
            userId: true,
            sleeperUsername: true,
            emailVerifiedAt: true,
            phoneVerifiedAt: true,
            verificationMethod: true,
            profileComplete: true,
          },
          take: 10,
        })

    const profileMap = new Map<string, any>()
    for (const profile of profiles) {
      if (profile?.userId) profileMap.set(profile.userId, profile)
    }

    const latestAudit = await prisma.adminAuditLog.findMany({
      where: {
        action: {
          startsWith: "password_reset_request_",
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    })

    const matchingAudit = latestAudit.filter((entry) => {
      const details = entry.details && typeof entry.details === "object"
        ? (entry.details as Record<string, unknown>)
        : null
      const auditEmail = asString(details?.emailLower) ?? asString(details?.email)
      const auditUserId = asString(details?.userId)
      return (
        (email && auditEmail?.toLowerCase() === email) ||
        (userIds.length > 0 && auditUserId != null && userIds.includes(auditUserId))
      )
    })

    await logAdminAudit({
      adminUserId: pickAdminActor(gate.user),
      action: "admin_user_lookup",
      targetType: "app_user_lookup",
      targetId: email || username || sleeperUsername || undefined,
      details: {
        email: email || null,
        username: username || null,
        sleeperUsername: sleeperUsername || null,
        resultCount: users.length,
        auditMatches: matchingAudit.length,
      },
    })

    return NextResponse.json({
      ok: true,
      users: users.map((user: any) => {
        const profile = profileMap.get(user.id)
        return {
          ...user,
          sleeperUsername: profile?.sleeperUsername ?? null,
          phoneVerified: Boolean(profile?.phoneVerifiedAt),
          verificationMethod: profile?.verificationMethod ?? null,
          profileComplete: Boolean(profile?.profileComplete),
        }
      }),
      profilesWithoutUser: profiles
        .filter((profile: any) => !userIds.includes(profile.userId))
        .map((profile: any) => ({
          userId: profile.userId,
          sleeperUsername: profile.sleeperUsername ?? null,
          phoneVerified: Boolean(profile.phoneVerifiedAt),
          verificationMethod: profile.verificationMethod ?? null,
          profileComplete: Boolean(profile.profileComplete),
        })),
      passwordResetAudit: matchingAudit.map((entry) => ({
        id: entry.id,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        details: entry.details,
        createdAt: entry.createdAt,
      })),
    })
  } catch (error) {
    console.error("[admin/users/lookup] GET error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lookup failed" },
      { status: 500 }
    )
  }
}
