import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sha256Hex } from "@/lib/tokens"

export const runtime = "nodejs"

function safeReturnTo(input: string | null): string {
  if (!input) return "/dashboard"
  return input.startsWith("/") ? input : "/dashboard"
}

function redirectTo(req: Request, path: string, returnTo?: string | null) {
  const origin = new URL(req.url).origin
  const target = new URL(path, origin)
  if (returnTo && returnTo.startsWith("/")) {
    target.searchParams.set("returnTo", returnTo)
  }
  return NextResponse.redirect(target)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get("token")
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"))

  if (!token) return redirectTo(req, "/verify?error=INVALID_LINK", returnTo)

  const tokenHash = sha256Hex(token)

  const row = await (prisma as any).emailVerifyToken.findUnique({
    where: { tokenHash },
  }).catch(() => null)

  if (!row) return redirectTo(req, "/verify?error=INVALID_LINK", returnTo)

  if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
    await (prisma as any).emailVerifyToken.delete({ where: { tokenHash } }).catch(() => {})
    return redirectTo(req, "/verify?error=EXPIRED_LINK", returnTo)
  }

  const now = new Date()

  try {
    await (prisma as any).$transaction(async (tx: any) => {
      await tx.appUser.updateMany({
        where: { id: row.userId },
        data: { emailVerified: now },
      })

      await tx.userProfile.updateMany({
        where: { userId: row.userId },
        data: { emailVerifiedAt: now },
      })

      await tx.emailVerifyToken.delete({
        where: { tokenHash },
      })
    })
  } catch (txErr) {
    console.error("[verify/email] Transaction failed:", txErr)
    return redirectTo(req, "/verify?error=INVALID_LINK", returnTo)
  }

  return redirectTo(req, "/verify?verified=email", returnTo)
}
