import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await (prisma as any).appUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
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
        profileComplete: true,
        ageConfirmedAt: true,
      },
    }).catch(() => null)

    return NextResponse.json({ user, profile })
  } catch (error) {
    console.error("[GET /api/user/profile]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
