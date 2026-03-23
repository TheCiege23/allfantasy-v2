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

  await client.emails.send({
    from: fromEmail || "AllFantasy.ai <noreply@allfantasy.ai>",
    to: params.targetEmail,
    subject: "Verify your updated email for AllFantasy.ai",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 20px; }
    .container { max-width: 520px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 32px; border: 1px solid #334155; }
    .logo { font-size: 24px; font-weight: 700; background: linear-gradient(90deg, #22d3ee, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .btn { display: inline-block; background: linear-gradient(90deg, #22d3ee, #a855f7); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; margin-top: 20px; }
    .muted { color:#94a3b8; }
    .footer { text-align:center; margin-top: 24px; font-size: 12px; color:#64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div style="text-align:center;">
      <div class="logo">AllFantasy.ai</div>
      <h2 style="margin:16px 0 8px;color:#f1f5f9;">Verify your updated email</h2>
      <p class="muted">Click the button below to verify this new email address.</p>
      <a href="${verifyUrl}" class="btn">Verify Email</a>
      <p class="muted" style="font-size:13px;margin-top:16px;">This link expires in 1 hour.</p>
    </div>
    <div class="footer">
      <p>If you did not request this change, secure your account immediately.</p>
    </div>
  </div>
</body>
</html>`,
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
