import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { assertCommissioner } from "@/lib/commissioner/permissions"
import { getLeaguePrivacySettings } from "@/lib/league-privacy"
import { buildFantasyInviteLink, generateInviteToken, getDefaultFantasyInviteExpiry } from "@/lib/league-invite"

export const dynamic = "force-dynamic"

function getBaseUrl(req: NextRequest): string {
  return req.headers.get("x-forwarded-host")
    ? `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("x-forwarded-host")}`
    : process.env.NEXTAUTH_URL ?? "https://allfantasy.ai"
}

/**
 * POST: Send league invite by username or email (commissioner only).
 * Body: { type: 'username' | 'email', username?: string, email?: string }
 * Returns inviteUrl; for email optionally sends via Resend.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { leagueId } = await params
    await assertCommissioner(leagueId, userId)
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const type = body?.type === "username" || body?.type === "email" ? body.type : null
  const username = typeof body?.username === "string" ? body.username.trim() : ""
  const email = typeof body?.email === "string" ? body.email.trim() : ""

  if (!type || (type === "username" && !username) || (type === "email" && !email)) {
    return NextResponse.json(
      { error: "Provide type and username or email" },
      { status: 400 }
    )
  }

  const league = await prisma.league.findUnique({
    where: { id: (await params).leagueId },
    select: { id: true, name: true, settings: true },
  })
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 })

  const privacy = await getLeaguePrivacySettings(league.id)
  if (type === "email" && !privacy.allowEmailInvite) {
    return NextResponse.json({ error: "Email invites are disabled for this league." }, { status: 403 })
  }
  if (type === "username" && !privacy.allowUsernameInvite) {
    return NextResponse.json({ error: "Username invites are disabled for this league." }, { status: 403 })
  }

  const settings = (league.settings as Record<string, unknown>) || {}
  let inviteCode = (settings.inviteCode as string) ?? null
  let inviteExpiresAt = settings.inviteExpiresAt as string | null | undefined
  if (!inviteCode || !inviteExpiresAt) {
    inviteCode = inviteCode || generateInviteToken(8)
    inviteExpiresAt = inviteExpiresAt || getDefaultFantasyInviteExpiry()
    await prisma.league.update({
      where: { id: league.id },
      data: { settings: { ...settings, inviteCode, inviteExpiresAt } },
    })
  }

  const baseUrl = getBaseUrl(req)
  const inviteUrl = buildFantasyInviteLink(inviteCode || generateInviteToken(8), baseUrl)
  const leagueName = (league.name as string) || "League"

  if (type === "email") {
    try {
      const { getResendClient } = await import("@/lib/resend-client")
      const { client, fromEmail } = getResendClient()
      const sent = await client.emails.send({
        from: fromEmail,
        to: email,
        subject: `You're invited to join ${leagueName} on AllFantasy`,
        html: `You've been invited to join <strong>${leagueName}</strong>. Use this link to join: <a href="${inviteUrl}">${inviteUrl}</a>`,
      })
      if (sent.error) {
        return NextResponse.json({ error: sent.error.message || "Failed to send email", inviteUrl }, { status: 500 })
      }
      return NextResponse.json({ ok: true, inviteUrl, sent: true, sentTo: email })
    } catch (e) {
      return NextResponse.json(
        { ok: true, inviteUrl, sent: false, error: (e as Error).message },
        { status: 200 }
      )
    }
  }

  if (type === "username") {
    const appUser = await prisma.appUser.findFirst({
      where: {
        username: { equals: username, mode: "insensitive" },
      },
      select: { id: true, username: true, displayName: true },
    })
    const profile = appUser
      ? null
      : await prisma.userProfile.findFirst({
          where: {
            OR: [
              { displayName: { contains: username, mode: "insensitive" } },
              { sleeperUsername: { contains: username, mode: "insensitive" } },
            ],
          },
          select: { userId: true, displayName: true, sleeperUsername: true },
        })
    const resolvedTarget =
      appUser?.username ??
      appUser?.displayName ??
      profile?.displayName ??
      profile?.sleeperUsername ??
      null
    return NextResponse.json({
      ok: true,
      inviteUrl,
      sentTo: resolvedTarget ?? undefined,
      message: "Share the link below with this user.",
    })
  }

  return NextResponse.json({ ok: true, inviteUrl })
}
