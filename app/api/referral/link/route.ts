import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getOrCreateReferralCode, buildReferralLink } from "@/lib/referral"

export const runtime = "nodejs"

function getBaseUrl(req: NextRequest): string {
  return process.env.NEXTAUTH_URL ?? req.nextUrl?.origin ?? "https://allfantasy.ai"
}

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { code } = await getOrCreateReferralCode(session.user.id)
  const baseUrl = getBaseUrl(req)
  const link = buildReferralLink(code, baseUrl)
  return NextResponse.json({ ok: true, code, link })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
