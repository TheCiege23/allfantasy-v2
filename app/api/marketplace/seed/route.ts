import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { seedDefaultMarketplaceItems } from "@/lib/league-economy/seedDefaultItems"
import { adminUnauthorized, isAuthorizedRequest } from "@/lib/adminAuth"

export const dynamic = "force-dynamic"

/**
 * POST /api/marketplace/seed — seed default marketplace items if none exist (idempotent).
 */
export async function POST(req?: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (process.env.NODE_ENV === "production" && (!req || !isAuthorizedRequest(req))) {
      return adminUnauthorized()
    }
    const added = await seedDefaultMarketplaceItems()
    return NextResponse.json({ seeded: added })
  } catch (e) {
    console.error("[marketplace/seed POST]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Seed failed" },
      { status: 500 }
    )
  }
}
