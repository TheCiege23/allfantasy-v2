import { NextResponse } from "next/server"
import { getClientIp, rateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

function normalizePhone(phone: string): string {
  const stripped = phone.trim().replace(/[\s()-]/g, "")
  if (!stripped) return ""
  if (stripped.startsWith("+")) return stripped
  return `+1${stripped}`
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const phone = normalizePhone(String(body?.phone || ""))
  if (!phone) {
    return NextResponse.json({ error: "MISSING_PHONE" }, { status: 400 })
  }
  if (!/^\+\d{10,15}$/.test(phone)) {
    return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 })
  }

  const ip = getClientIp(req)
  const rl = rateLimit(`signup-phone-start:${ip}:${phone}`, 3, 120_000)
  if (!rl.success) {
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        message: "Please wait before requesting another code.",
      },
      { status: 429 }
    )
  }

  try {
    const { getTwilioClient } = await import("@/lib/twilio-client")
    const client = await getTwilioClient()
    const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID
    if (!verifySid) {
      return NextResponse.json(
        { error: "PHONE_VERIFY_NOT_CONFIGURED" },
        { status: 500 }
      )
    }

    await client.verify.v2.services(verifySid).verifications.create({
      to: phone,
      channel: "sms",
    })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("[auth/phone/signup/start] error:", err?.message || err)
    return NextResponse.json(
      { error: "SEND_FAILED", message: "Failed to send verification code." },
      { status: 500 }
    )
  }
}
