import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sha256Hex } from "@/lib/tokens"
import { getClientIp, rateLimit } from "@/lib/rate-limit"
import { logPasswordResetAudit } from "@/lib/auth/password-reset-audit"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const rl = rateLimit(`pw-reset:${ip}`, 5, 600_000)
  if (!rl.success) {
    void logPasswordResetAudit({
      outcome: "rate_limited",
      type: "email",
      ip,
      detail: { limiter: "pw-reset" },
    })
    return NextResponse.json({ ok: true })
  }

  const body = await req.json().catch(() => ({}))
  const type = String(body?.type || "email").toLowerCase()
  const email = String(body?.email || "").toLowerCase().trim()
  let phone = String(body?.phone || "").trim().replace(/[\s()-]/g, "")
  if (phone && !phone.startsWith("+")) phone = "+1" + phone

  if (type === "sms") {
    if (!/^\+\d{10,15}$/.test(phone)) {
      void logPasswordResetAudit({
        outcome: "invalid_sms_phone",
        type: "sms",
        phone,
        ip,
      })
      return NextResponse.json({ ok: true })
    }
    const profile = await (prisma as any).userProfile.findUnique({
      where: { phone },
      select: { userId: true },
    }).catch(() => null)
    if (!profile) {
      void logPasswordResetAudit({
        outcome: "sms_profile_not_found",
        type: "sms",
        phone,
        ip,
      })
      return NextResponse.json({ ok: true })
    }

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
      if (!fromNumber) {
        void logPasswordResetAudit({
          outcome: "sms_provider_missing",
          type: "sms",
          userId: profile.userId,
          phone,
          ip,
        })
        return NextResponse.json({ ok: true })
      }
      await client.messages.create({
        body: `Your AllFantasy password reset code is: ${code}. It expires in 15 minutes.`,
        from: fromNumber,
        to: phone,
      })
      void logPasswordResetAudit({
        outcome: "sms_sent",
        type: "sms",
        userId: profile.userId,
        phone,
        ip,
      })
    } catch (error) {
      void logPasswordResetAudit({
        outcome: "sms_send_failed",
        type: "sms",
        userId: profile.userId,
        phone,
        ip,
        detail: { error: error instanceof Error ? error.message : String(error) },
      })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ ok: true, method: "sms" })
  }

  if (!email) {
    void logPasswordResetAudit({
      outcome: "empty_email",
      type: "email",
      ip,
    })
    return NextResponse.json({ ok: true })
  }

  const user = await (prisma as any).appUser.findUnique({
    where: { email },
    select: { id: true, email: true },
  }).catch(() => null)

  if (!user) {
    void logPasswordResetAudit({
      outcome: "email_user_not_found",
      type: "email",
      email,
      ip,
    })
    return NextResponse.json({ ok: true })
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const tokenHash = sha256Hex(code)
  const expiresAt = new Date(Date.now() + 1000 * 60 * 15)

  await (prisma as any).passwordResetToken.deleteMany({
    where: { userId: user.id },
  }).catch(() => {})

  await (prisma as any).passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  })
  void logPasswordResetAudit({
    outcome: "email_token_created",
    type: "email",
    userId: user.id,
    email: user.email,
    ip,
  })

  try {
    const { getResendClient } = await import("@/lib/resend-client")
    const { client } = await getResendClient()

    const result = await client.emails.send({
      from: process.env.RESEND_FROM || "noreply@allfantasy.ai",
      to: user.email,
      subject: "Your AllFantasy password reset code",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 20px; }
    .container { max-width: 520px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 32px; border: 1px solid #334155; }
    .logo { font-size: 24px; font-weight: 700; background: linear-gradient(90deg, #22d3ee, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .code { display: inline-block; font-size: 30px; letter-spacing: 8px; font-weight: 700; color: #22d3ee; margin: 14px 0; }
    .muted { color:#94a3b8; }
    .footer { text-align:center; margin-top: 24px; font-size: 12px; color:#64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div style="text-align:center;">
      <div class="logo">AllFantasy.ai</div>
      <h2 style="margin:16px 0 8px;color:#f1f5f9;">Reset your password</h2>
      <p class="muted">Use this one-time code in the AllFantasy password reset screen.</p>
      <div class="code">${code}</div>
      <p class="muted" style="font-size:13px;margin-top:16px;">Code expires in 15 minutes.</p>
    </div>
    <div class="footer">
      <p>If you didn't request this, you can ignore it.</p>
    </div>
  </div>
</body>
</html>`,
    })

    if ("error" in result && result.error) {
      console.error("[auth][password-reset][request] resend error", {
        userId: user.id,
        email: user.email,
        message: result.error.message,
      })
      void logPasswordResetAudit({
        outcome: "email_send_failed",
        type: "email",
        userId: user.id,
        email: user.email,
        ip,
        detail: { provider: "resend", message: result.error.message },
      })
      await (prisma as any).passwordResetToken.deleteMany({
        where: { userId: user.id },
      }).catch(() => {})
      return NextResponse.json(
        {
          ok: false,
          message: "Unable to send password reset email right now. Please try again later.",
        },
        { status: 500 }
      )
    }
    void logPasswordResetAudit({
      outcome: "email_sent",
      type: "email",
      userId: user.id,
      email: user.email,
      ip,
      detail: {
        provider: "resend",
        emailId: "data" in result && result.data?.id ? result.data.id : null,
        from: process.env.RESEND_FROM || "noreply@allfantasy.ai",
      },
    })
  } catch (error) {
    console.error("[auth][password-reset][request] email send failed", {
      userId: user.id,
      email: user.email,
      error: error instanceof Error ? error.message : String(error),
    })
    void logPasswordResetAudit({
      outcome: "email_send_failed",
      type: "email",
      userId: user.id,
      email: user.email,
      ip,
      detail: {
        provider: "resend",
        message: error instanceof Error ? error.message : String(error),
      },
    })
    await (prisma as any).passwordResetToken.deleteMany({
      where: { userId: user.id },
    }).catch(() => {})
    return NextResponse.json(
      {
        ok: false,
        message: "Unable to send password reset email right now. Please try again later.",
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, method: "email" })
}

