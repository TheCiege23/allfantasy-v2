import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sha256Hex } from "@/lib/tokens"
import { getClientIp, rateLimit } from "@/lib/rate-limit"
import { logPasswordResetAudit } from "@/lib/auth/password-reset-audit"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
  const ip = getClientIp(req)
  const rl = rateLimit(`pw-reset:${ip}`, 5, 600_000)
  if (!rl.success) {
    void logPasswordResetAudit({
      outcome: "rate_limited",
      type: "email",
      ip,
      detail: { limiter: "pw-reset" },
    })
    return NextResponse.json({ ok: true }, { status: 200 })
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
      return NextResponse.json({ ok: true }, { status: 200 })
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
      return NextResponse.json({ ok: true }, { status: 200 })
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
        return NextResponse.json({ ok: true }, { status: 200 })
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
      return NextResponse.json({ ok: true }, { status: 200 })
    }
    return NextResponse.json({ ok: true, method: "sms" }, { status: 200 })
  }

  if (!email) {
    void logPasswordResetAudit({
      outcome: "empty_email",
      type: "email",
      ip,
    })
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!supabaseUrl || !supabaseAnon) {
    console.error("[pw-reset] Supabase not configured (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)")
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  const { createClient } = await import("@supabase/supabase-js")
  const supabase = createClient(supabaseUrl, supabaseAnon)
  const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "https://www.allfantasy.ai/auth/callback?next=/reset-password",
  })

  if (resetErr) {
    console.error("[pw-reset] resetPasswordForEmail:", { email, message: resetErr.message })
    void logPasswordResetAudit({
      outcome: "email_send_failed",
      type: "email",
      email,
      ip,
      detail: { provider: "supabase", message: resetErr.message },
    })
  } else {
    void logPasswordResetAudit({
      outcome: "email_sent",
      type: "email",
      email,
      ip,
      detail: { provider: "supabase" },
    })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error("[password/reset/request] unexpected:", err)
    return NextResponse.json({ ok: true }, { status: 200 })
  }
}

