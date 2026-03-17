import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"
import { sha256Hex, makeToken, isStrongPassword } from "@/lib/tokens"
import { containsProfanity } from "@/lib/profanity"
import { getClientIp, rateLimit } from "@/lib/rate-limit"
import { attributeSignup, grantRewardForSignup } from "@/lib/referral"

export const runtime = "nodejs"

function normalizeUsername(u: string) {
  return u.trim().toLowerCase()
}

function normalizeEmail(e: string) {
  return e.trim().toLowerCase()
}

function normalizePhone(p?: string | null) {
  const s = (p ?? "").trim()
  return s.length ? s : null
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const rl = rateLimit(`signup:${ip}`, 5, 600_000)
    if (!rl.success) {
      return NextResponse.json({ error: "Too many signup attempts. Please wait a few minutes." }, { status: 429 })
    }

    const body = await req.json()
    const {
      password,
      displayName,
      phone,
      sleeperUsername,
      ageConfirmed,
      verificationMethod,
      timezone,
      preferredLanguage,
      avatarPreset,
      disclaimerAgreed,
      termsAgreed,
      referralCode: referralCodeFromBody,
    } = body

    const cookieStore = await cookies()
    const referralCodeFromCookie = cookieStore.get("af_ref")?.value ?? null
    const referralCode = typeof referralCodeFromBody === "string" && referralCodeFromBody.trim()
      ? referralCodeFromBody.trim().toUpperCase()
      : referralCodeFromCookie?.trim().toUpperCase() || null

    const username = normalizeUsername(String(body?.username ?? ""))
    const email = normalizeEmail(String(body?.email ?? ""))

    if (!username || username.length < 3 || username.length > 30) {
      return NextResponse.json({ error: "Username must be 3-30 characters." }, { status: 400 })
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: "Username can only contain letters, numbers, and underscores." }, { status: 400 })
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 })
    }

    if (containsProfanity(username)) {
      return NextResponse.json(
        { error: "Please choose a different username." },
        { status: 400 },
      )
    }

    if (!isStrongPassword(String(password ?? ""))) {
      return NextResponse.json({ error: "Password must be at least 8 characters with a letter and number." }, { status: 400 })
    }

    if (!ageConfirmed) {
      return NextResponse.json({ error: "You must confirm you are 18 or older." }, { status: 400 })
    }

    if (!termsAgreed) {
      return NextResponse.json({ error: "You must agree to the Terms and Conditions." }, { status: 400 })
    }

    if (!disclaimerAgreed) {
      return NextResponse.json({ error: "You must agree to the fantasy sports disclaimer (no gambling/DFS)." }, { status: 400 })
    }

    const method = verificationMethod === "PHONE" ? "PHONE" : "EMAIL"
    if (method === "PHONE" && !normalizePhone(phone)) {
      return NextResponse.json({ error: "Phone is required for phone verification." }, { status: 400 })
    }

    const existing = await prisma.appUser.findFirst({
      where: {
        OR: [
          { email: { equals: email, mode: "insensitive" } },
          { username: { equals: username, mode: "insensitive" } },
        ],
      },
      select: { id: true, email: true, username: true },
    })

    if (existing?.email && existing.email.toLowerCase() === email.toLowerCase()) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      )
    }
    if (existing?.username && existing.username.toLowerCase() === username.toLowerCase()) {
      return NextResponse.json(
        { error: "This username is already taken." },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const now = new Date()

    let sleeperData: { sleeperUsername?: string; sleeperUserId?: string; sleeperLinkedAt?: Date } = {}
    if (sleeperUsername) {
      try {
        const sleeperRes = await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(sleeperUsername.trim())}`)
        if (sleeperRes.ok) {
          const sleeperUser = await sleeperRes.json()
          if (sleeperUser && sleeperUser.user_id) {
            sleeperData = {
              sleeperUsername: sleeperUser.username || sleeperUsername.trim(),
              sleeperUserId: sleeperUser.user_id,
              sleeperLinkedAt: now,
            }
          }
        }
      } catch {}
    }

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.appUser.create({
        data: {
          email,
          username,
          passwordHash,
          displayName: displayName?.trim() || username,
        },
        select: { id: true, email: true, username: true },
      })

      await tx.userProfile.create({
        data: {
          userId: created.id,
          displayName: displayName?.trim() || username,
          phone: normalizePhone(phone),
          ageConfirmedAt: now,
          verificationMethod: method,
          ...sleeperData,
          profileComplete: false,
          timezone: typeof timezone === "string" ? timezone : null,
          preferredLanguage:
            typeof preferredLanguage === "string" ? preferredLanguage : null,
          avatarPreset: typeof avatarPreset === "string" ? avatarPreset : null,
        },
      })

      return created
    }).catch((err) => {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const target = Array.isArray(err.meta?.target) ? err.meta?.target : []
        if (target?.includes("email")) {
          throw new Response(
            JSON.stringify({ error: "An account with this email already exists." }),
            { status: 409 }
          )
        }
        if (target?.includes("username")) {
          throw new Response(
            JSON.stringify({ error: "This username is already taken." }),
            { status: 409 }
          )
        }
      }
      throw err
    })

    if (referralCode) {
      const attribution = await attributeSignup(user.id, referralCode)
      if (attribution?.referrerId) {
        await grantRewardForSignup(attribution.referrerId)
      }
    }

    if (method === "PHONE") {
      return NextResponse.json({
        ok: true,
        userId: user.id,
        verificationMethod: "PHONE",
        message: "Account created. Please sign in and verify your phone number.",
      })
    }

    const rawToken = makeToken(32)
    const tokenHash = sha256Hex(rawToken)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60)

    await (prisma as any).emailVerifyToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    })

    try {
      const { getResendClient } = await import("@/lib/resend-client")
      const { client, fromEmail } = await getResendClient()

      const { getBaseUrl } = await import("@/lib/get-base-url")
      const baseUrl = getBaseUrl()
      const verifyUrl = `${baseUrl}/verify/email?token=${encodeURIComponent(rawToken)}`

      await client.emails.send({
        from: fromEmail || "AllFantasy.ai <noreply@allfantasy.ai>",
        to: email,
        subject: "Verify your AllFantasy.ai email",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 32px; border: 1px solid #334155; }
    .logo { font-size: 24px; font-weight: 700; background: linear-gradient(90deg, #22d3ee, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .btn { display: inline-block; background: linear-gradient(90deg, #22d3ee, #a855f7); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; margin-top: 20px; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div style="text-align:center;">
      <div class="logo">AllFantasy.ai</div>
      <h2 style="margin:16px 0 8px;color:#f1f5f9;">Verify Your Email</h2>
      <p style="color:#94a3b8;">Welcome, ${displayName?.trim() || username}! Click the button below to verify your email address.</p>
      <a href="${verifyUrl}" class="btn">Verify Email</a>
      <p style="color:#64748b;font-size:13px;margin-top:16px;">This link expires in 1 hour.</p>
    </div>
    <div class="footer">
      <p>If you didn't create this account, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>`,
      })
    } catch (emailErr) {
      console.error("[register] Failed to send verification email:", emailErr)
    }

    return NextResponse.json({
      ok: true,
      userId: user.id,
      verificationMethod: "EMAIL",
      message: "Account created. Please check your email to verify.",
    })
  } catch (err: any) {
    if (err instanceof Response) {
      return err
    }
    console.error("[register] error:", err)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
