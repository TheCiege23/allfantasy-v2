import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getClientIp, rateLimit } from "@/lib/rate-limit"
import { makeToken, sha256Hex } from "@/lib/tokens"

export const runtime = "nodejs"

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function resolveSafeReturnTo(value: string | undefined): string {
  const candidate = String(value ?? "").trim()
  return candidate.startsWith("/") ? candidate : "/settings"
}

async function sendVerificationEmail(params: {
  userId: string
  targetEmail: string
  returnTo: string
}): Promise<boolean> {
  const rawToken = makeToken(32)
  const tokenHash = sha256Hex(rawToken)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await (prisma as any).emailVerifyToken.deleteMany({
    where: { userId: params.userId },
  }).catch(() => {})

  await (prisma as any).emailVerifyToken.create({
    data: { userId: params.userId, tokenHash, expiresAt },
  })

  const { getBaseUrl } = await import("@/lib/get-base-url")
  const baseUrl = getBaseUrl()
  if (!baseUrl) return false

  const verifyUrl = `${baseUrl}/verify/email?token=${encodeURIComponent(rawToken)}&returnTo=${encodeURIComponent(params.returnTo)}`

  const { getResendClient } = await import("@/lib/resend-client")
  const { client, fromEmail } = await getResendClient()

  const { buildVerificationEmailHtml } = await import("@/lib/email/verification-email-html")

  await client.emails.send({
    from: fromEmail || "AllFantasy.ai <noreply@allfantasy.ai>",
    to: params.targetEmail,
    subject: "Verify your updated email for AllFantasy.ai",
    html: buildVerificationEmailHtml({
      title: "Verify your updated email",
      greeting: "Click the button below to verify this new email address.",
      verifyUrl,
      footerNote: "If you did not request this change, secure your account immediately.",
    }),
  })

  return true
}

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const ip = getClientIp(req)
  const rl = rateLimit(`contact-email-update:${userId}:${ip}`, 5, 10 * 60 * 1000)
  if (!rl.success) {
    return NextResponse.json({ error: "RATE_LIMITED", message: "Too many attempts. Please try again soon." }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const email = normalizeEmail(String(body?.email ?? ""))
  const currentPassword = String(body?.currentPassword ?? "")
  const returnTo = resolveSafeReturnTo(body?.returnTo)

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 })
  }

  const user = await (prisma as any).appUser.findUnique({
    where: { id: userId },
    select: { id: true, email: true, passwordHash: true },
  })
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const emailInUse = await (prisma as any).appUser.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      NOT: { id: userId },
    },
    select: { id: true },
  })
  if (emailInUse) {
    return NextResponse.json({ error: "EMAIL_ALREADY_IN_USE" }, { status: 409 })
  }

  const currentEmail = normalizeEmail(String(user.email ?? ""))
  if (currentEmail === email) {
    return NextResponse.json({ ok: true, unchanged: true, verificationEmailSent: false })
  }

  if (user.passwordHash) {
    if (!currentPassword.trim()) {
      return NextResponse.json(
        { error: "CURRENT_PASSWORD_REQUIRED", message: "Current password is required to change email." },
        { status: 400 }
      )
    }
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isPasswordValid) {
      return NextResponse.json({ error: "WRONG_PASSWORD", message: "Current password is incorrect." }, { status: 400 })
    }
  }

  try {
    await (prisma as any).$transaction(async (tx: any) => {
      await tx.appUser.update({
        where: { id: userId },
        data: {
          email,
          emailVerified: null,
        },
      })

      await tx.userProfile.updateMany({
        where: { userId },
        data: { emailVerifiedAt: null },
      })
    })
  } catch (err: any) {
    const code = err?.code
    if (code === "P2002") {
      return NextResponse.json({ error: "EMAIL_ALREADY_IN_USE" }, { status: 409 })
    }
    console.error("[user/contact/email] update failed:", err)
    return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 })
  }

  let verificationEmailSent = false
  try {
    verificationEmailSent = await sendVerificationEmail({
      userId,
      targetEmail: email,
      returnTo,
    })
  } catch (err) {
    console.warn("[user/contact/email] verification email send failed:", err)
  }

  return NextResponse.json({
    ok: true,
    email,
    verificationEmailSent,
  })
}
