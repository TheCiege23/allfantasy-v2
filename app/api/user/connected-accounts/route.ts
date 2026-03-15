import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export type SignInProviderId = "google" | "apple" | "facebook" | "instagram" | "x" | "tiktok"

const PROVIDER_IDS: SignInProviderId[] = ["google", "apple", "facebook", "instagram", "x", "tiktok"]

const PROVIDER_NAMES: Record<SignInProviderId, string> = {
  google: "Google",
  apple: "Apple",
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X (Twitter)",
  tiktok: "TikTok",
}

function isProviderConfigured(providerId: SignInProviderId): boolean {
  switch (providerId) {
    case "google":
      return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    case "apple":
      return process.env.NEXT_PUBLIC_ENABLE_APPLE_AUTH === "true"
    case "facebook":
    case "instagram":
    case "x":
    case "tiktok":
      return false
    default:
      return false
  }
}

/**
 * GET /api/user/connected-accounts
 * Returns sign-in provider status: configured (env) and linked (AuthAccount) for the current user.
 */
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const accounts = await (prisma as any).authAccount.findMany({
    where: { userId: session.user.id },
    select: { provider: true },
  }).catch(() => [])

  const linkedSet = new Set((accounts as { provider: string }[]).map((a) => a.provider.toLowerCase()))

  const providers = PROVIDER_IDS.map((id) => ({
    id,
    name: PROVIDER_NAMES[id],
    configured: isProviderConfigured(id),
    linked: linkedSet.has(id),
  }))

  return NextResponse.json({ providers })
}
