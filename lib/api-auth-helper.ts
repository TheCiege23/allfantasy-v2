import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export interface ApiSession {
  userId: string
  email: string | null
  name: string | null
}

export type ApiAuthResult =
  | { ok: true; session: ApiSession }
  | { ok: false; response: NextResponse }

/**
 * Validates the NextAuth session for a protected API route.
 *
 * Usage:
 *   const auth = await requireApiSession()
 *   if (!auth.ok) return auth.response
 *   const { userId } = auth.session
 */
export async function requireApiSession(): Promise<ApiAuthResult> {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string; email?: string | null; name?: string | null }
  } | null

  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }),
    }
  }

  return {
    ok: true,
    session: {
      userId: session.user.id,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
    },
  }
}
