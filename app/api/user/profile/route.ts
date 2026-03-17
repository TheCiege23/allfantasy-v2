import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string; email?: string | null }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  const user = await (prisma as any).appUser.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      emailVerified: true,
      createdAt: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const profile = await (prisma as any).userProfile.findUnique({
    where: { userId },
    select: {
      sleeperUsername: true,
      sleeperUserId: true,
      phone: true,
      isVerified: true,
      isAgeConfirmed: true,
      profileComplete: true,
      displayName: true,
    },
  }).catch(() => null)

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    },
    profile: profile || null,
  })
}
