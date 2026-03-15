import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sha256Hex, makeToken } from "@/lib/tokens"
import { getClientIp, rateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const rl = rateLimit(`pw-reset:${ip}`, 5, 600_000)
  if (!rl.success) {
    return NextResponse.json({ ok: true })
  }

  const body = await req.json().catch(() => ({}))
  const type = String(body?.type || "email").toLowerCase()
  const email = String(body?.email || "").toLowerCase().trim()
  let phone = String(body?.phone || "").trim().replace(/[\s()-]/g, "")
  if (phone && !phone.startsWith("+")) phone = "+1" + phone
  const requestedReturnTo = String(body?.returnTo || "")
  const safeReturnTo = requestedReturnTo.startsWith("/") ? requestedReturnTo : "/dashboard"

  if (type === "sms") {
    if (!/^\+\d{10,15}$/.test(phone)) return NextResponse.json({ ok: true })
    const profile = await (prisma as any).userProfile.findUnique({
      where: { phone },
      select: { userId: true },
    }).catch(() => null)
    if (!profile) return NextResponse.json({ ok: true })

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const tokenHash = sha256Hex(code)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15)

    await (prisma as any).passwordResetToken.deleteMany({
      where: { userId: profile.userId },
    }).catch(() => {})

    await (prisma as any).passwordResetToken.create({
      data: { userId: profile.userId, tokenHash, expiresAt },
    })

    try {
      const { getTwilioClient } = await import("@/lib/twilio-client")
      const client = await getTwilioClient()
      const fromNumber = process.env.TWILIO_PHONE_NUMBER
      if (!fromNumber) return NextResponse.json({ ok: true })
      await client.messages.create({
        body: `Your AllFantasy password reset code is: ${code}. It expires in 15 minutes.`,
        from: fromNumber,
        to: phone,
      })
    } catch {
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ ok: true, method: "sms" })
  }

  if (!email) return NextResponse.json({ ok: true })

  const user = await (prisma as any).appUser.findUnique({
    where: { email },
    select: { id: true, email: true },
  }).catch(() => null)

  if (!user) return NextResponse.json({ ok: true })

  const rawToken = makeToken(32)
  const tokenHash = sha256Hex(rawToken)
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30)

  await (prisma as any).passwordResetToken.deleteMany({
    where: { userId: user.id },
  }).catch(() => {})

  await (prisma as any).passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  })

  const { getBaseUrl } = await import("@/lib/get-base-url")
  const baseUrl = getBaseUrl()
  if (!baseUrl) return NextResponse.json({ ok: true })

  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}&returnTo=${encodeURIComponent(safeReturnTo)}`

  const { getResendClient } = await import("@/lib/resend-client")
  const { client, fromEmail } = await getResendClient()

  await client.emails.send({
    from: fromEmail || "AllFantasy.ai <noreply@allfantasy.ai>",
    to: user.email,
    subject: "Reset your AllFantasy.ai password",
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
      <h2 style="margin:16px 0 8px;color:#f1f5f9;">Reset your password</h2>
      <p class="muted">Click the button below to set a new password. If you didn't request this, ignore this email.</p>
      <a href="${resetUrl}" class="btn">Reset Password</a>
      <p class="muted" style="font-size:13px;margin-top:16px;">This link expires in 30 minutes.</p>
    </div>
    <div class="footer">
      <p>If you didn't request this, you can ignore it.</p>
    </div>
  </div>
</body>
</html>`,
  })

  return NextResponse.json({ ok: true })
}

