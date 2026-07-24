import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/adminAuth"
import { issueInvite, listInvites, revokeInvite } from "@/lib/beta-invite/betaAdmissionService"
import { normalizeEmail } from "@/lib/beta-invite/betaAdmissionService"
import { getClientIp, rateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Admin-only closed-beta invite management. One route, three verbs:
 *   GET    → list invites (safe metadata; never token digests as usable secrets)
 *   POST   → issue an invite for an email; returns the raw token + one-time claim URL ONCE
 *   DELETE → revoke a still-pending invite
 *
 * `requireAdmin()` runs before every branch — the same gate as the rest of /api/admin.
 * The raw token is returned exactly once, in the POST response, and is never logged or
 * persisted (only its digest is stored).
 */

function adminIdentity(user: { id?: string; email?: string }): string {
  return user.email || user.id || "unknown-admin"
}

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  try {
    const invites = await listInvites({ limit: 200 })
    return NextResponse.json({ invites })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list invites"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  // Defense-in-depth rate limit on issuance (admin is already authenticated). Keyed by the
  // admin identity so one admin's burst can't starve another.
  const rl = rateLimit(`beta-issue:${adminIdentity(gate.user)}:${getClientIp(request)}`, 60, 600_000)
  if (!rl.success) {
    return NextResponse.json({ error: "Too many invites issued — slow down a moment." }, { status: 429 })
  }

  const body = (await request.json().catch(() => null)) as
    | { email?: unknown; expiresAt?: unknown; note?: unknown }
    | null

  const email = normalizeEmail(typeof body?.email === "string" ? body.email : "")
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 })
  }

  let expiresAt: Date | null = null
  if (typeof body?.expiresAt === "string" && body.expiresAt.trim()) {
    const parsed = new Date(body.expiresAt)
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "expiresAt is not a valid date." }, { status: 400 })
    }
    expiresAt = parsed
  }

  const note = typeof body?.note === "string" ? body.note : null

  try {
    const issued = await issueInvite({
      email,
      adminId: adminIdentity(gate.user),
      expiresAt,
      note,
    })

    const origin = new URL(request.url).origin
    // The one-time claim URL — the only place the raw token is ever surfaced.
    const claimUrl = `${origin}/api/auth/beta/claim?token=${encodeURIComponent(issued.rawToken)}`

    return NextResponse.json({
      id: issued.id,
      invitedEmail: issued.invitedEmail,
      expiresAt: issued.expiresAt,
      rawToken: issued.rawToken,
      claimUrl,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to issue invite"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const url = new URL(request.url)
  const id = (url.searchParams.get("id") ?? "").trim()
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 })

  try {
    const result = await revokeInvite({ id, adminId: adminIdentity(gate.user) })
    if (!result.ok) {
      const status = result.reason === "not_found" ? 404 : 409
      return NextResponse.json({ error: result.reason }, { status })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to revoke invite"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
