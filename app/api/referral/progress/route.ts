import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getReferrerProgress } from "@/lib/referral"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const progress = await getReferrerProgress(session.user.id)
  return NextResponse.json({ ok: true, progress })
}
