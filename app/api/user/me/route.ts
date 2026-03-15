import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveAdminEmail } from "@/lib/auth/admin"

export const dynamic = "force-dynamic"

/** GET /api/user/me — session user + isAdmin for client (e.g. landing header). */
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string; email?: string | null; name?: string | null }
  } | null

  if (!session?.user) {
    return NextResponse.json({ user: null, isAdmin: false })
  }

  const isAdmin = resolveAdminEmail(session.user.email)

  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
    isAdmin,
  })
}
