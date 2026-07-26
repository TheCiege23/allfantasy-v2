import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sha256Hex, makeToken } from "@/lib/tokens"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const requestedReturnTo = String(body?.returnTo || "")
  const safeReturnTo = requestedReturnTo.startsWith("/") ? requestedReturnTo : "/dashboard"

  const { getSessionAndProfile } = await import("@/lib/auth-guard")
  const { userId, email } = await getSessionAndProfile()

  if (!userId) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 })
  }

  const { getClientIp, rateLimit } = await import("@/lib/rate-limit")
  const ip = getClientIp(req)
  const rl = rateLimit(`verify-email:${userId}:${ip}`, 3, 120_000)
  if (!rl.success) {
    return NextResponse.json({ error: "RATE_LIMITED", message: "Please wait before requesting another email." }, { status: 429 })
  }

  const user = await (prisma as any).appUser.findUnique({
    where: { id: userId },
    select: { emailVerified: true, email: true },
  }).catch(() => null)

  const targetEmail = user?.email ?? email
  if (!targetEmail) {
    return NextResponse.json({ error: "MISSING_EMAIL" }, { status: 400 })
  }

  if (user?.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true })
  }

  const recentToken = await (prisma as any).emailVerifyToken.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  }).catch(() => null)

  if (recentToken?.createdAt && Date.now() - new Date(recentToken.createdAt).getTime() < 60_000) {
    return NextResponse.json({ error: "RATE_LIMITED", message: "Please wait 60 seconds before requesting another email." }, { status: 429 })
  }

  const rawToken = makeToken(32)
  const tokenHash = sha256Hex(rawToken)
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60)

  await (prisma as any).emailVerifyToken.deleteMany({ where: { userId } }).catch(() => {})
  const tokenRecord = await (prisma as any).emailVerifyToken.create({ data: { userId, tokenHash, expiresAt } })

  // Preview-aware, spoof-safe origin (mirrors the register route): a resend on a PREVIEW
  // deployment links back to the preview host so the token resolves in the preview DB;
  // production keeps the configured canonical. Never derived from a request header.
  const { getDeploymentLinkOrigin } = await import("@/lib/site-public-origin")
  const { USER_FACING_SITE_ORIGIN } = await import("@/lib/auth/user-facing-site-origin")
  const emailOrigin = getDeploymentLinkOrigin() || USER_FACING_SITE_ORIGIN
  const verifyUrl = `${emailOrigin}/verify/email?token=${encodeURIComponent(rawToken)}&returnTo=${encodeURIComponent(safeReturnTo)}`

  const { getResendClient } = await import("@/lib/resend-client")
  const { client, fromEmail } = await getResendClient()

  const { buildVerificationEmailHtml } = await import("@/lib/email/verification-email-html")
  const { buildEmailIdempotencyKey } = await import("@/lib/email/idempotency")

  await client.emails.send(
    {
      from: fromEmail || "AllFantasy.ai <noreply@allfantasy.ai>",
      to: targetEmail,
      subject: "Verify your email for AllFantasy.ai",
      html: buildVerificationEmailHtml({
        title: "Verify your email",
        greeting: "Click the button below to verify your AllFantasy.ai email address.",
        verifyUrl,
        footerNote: "If you didn't request this, you can safely ignore this email.",
      }),
    },
    { idempotencyKey: buildEmailIdempotencyKey("email-verify-resend", userId, tokenRecord.id) }
  )

  return NextResponse.json({ ok: true })
}
