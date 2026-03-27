import { NextRequest, NextResponse } from "next/server"
import { getReferrerIdByCode, getReferralCodeFromRequest, recordClick, setReferralCookie } from "@/lib/referral"

export const runtime = "nodejs"

/**
 * POST body: { ref: string } or query ?ref=XXX
 * Records a referral click and sets af_ref cookie for attribution on signup.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const refFromBody = typeof body?.ref === "string" ? body.ref.trim().toUpperCase() : null
  const refFromRequest = getReferralCodeFromRequest(req, { includeCookie: false })
  const code = refFromBody || refFromRequest
  if (!code) return NextResponse.json({ error: "Missing ref" }, { status: 400 })

  const referrerId = await getReferrerIdByCode(code)
  if (!referrerId) return NextResponse.json({ ok: false, error: "Invalid ref" }, { status: 400 })

  await recordClick(referrerId, {
    referralCode: code,
    userAgent: req.headers.get("user-agent") ?? undefined,
  })

  const response = NextResponse.json({ ok: true, clickRecorded: true })
  setReferralCookie(response, code)
  return response
}
