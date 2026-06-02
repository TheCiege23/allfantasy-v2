import crypto from "crypto"
import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { signAdminSessionCookie } from "@/lib/adminSession"
import { validateUsername } from "@/lib/auth/username-validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isBootstrapEnabled(): boolean {
  return process.env.ADMIN_BOOTSTRAP_ENABLED === "true"
}

function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

function timingSafeCompare(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a)
    const bb = Buffer.from(b)
    if (ab.length !== bb.length) return false
    return crypto.timingSafeEqual(ab, bb)
  } catch {
    return false
  }
}

function sanitizeUsernameCandidate(value: string): string {
  return value
    .trim()
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30)
}

function maskBootstrapEmail(email: string): string {
  const [name, domain] = email.split("@")
  const visible = name.length <= 2 ? `${name.slice(0, 1)}*` : `${name.slice(0, 2)}***`
  return `${visible}@${domain}`
}

async function resolveBootstrapUsername(email: string): Promise<string> {
  const fromEnv = sanitizeUsernameCandidate(process.env.ADMIN_BOOTSTRAP_USERNAME || "")
  const fromEmail = sanitizeUsernameCandidate(email.split("@")[0] || "admin")
  const base = validateUsername(fromEnv).ok ? fromEnv : validateUsername(fromEmail).ok ? fromEmail : "AdminUser"
  const candidates = [base, `${base.slice(0, 24)}_admin`, `admin_${Date.now().toString().slice(-6)}`]

  for (const candidate of candidates) {
    const validation = validateUsername(candidate)
    if (!validation.ok) continue
    const existing = await prisma.appUser.findFirst({
      where: { username: { equals: validation.normalized, mode: "insensitive" } },
      select: { id: true },
    })
    if (!existing) return validation.normalized
  }

  throw new Error("ADMIN_BOOTSTRAP_USERNAME_CONFLICT")
}

export async function POST(request: Request) {
  if (!isBootstrapEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const configuredEmail = normalizeEmail(process.env.ADMIN_BOOTSTRAP_EMAIL)
  const configuredPassword = String(process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "")
  if (!configuredEmail || !configuredEmail.includes("@") || configuredPassword.length < 12) {
    return NextResponse.json(
      { error: "Admin bootstrap is not configured safely." },
      { status: 500 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const email = normalizeEmail(body?.email)
  const password = String(body?.password ?? "")
  const credentialsMatch =
    timingSafeCompare(email, configuredEmail) && timingSafeCompare(password, configuredPassword)

  if (!credentialsMatch) {
    return NextResponse.json({ error: "Invalid bootstrap credentials." }, { status: 401 })
  }

  const passwordHash = await bcrypt.hash(configuredPassword, 12)
  const existing = await prisma.appUser.findFirst({
    where: { email: { equals: configuredEmail, mode: "insensitive" } },
    select: { id: true, username: true },
  })

  const user = existing
    ? await prisma.appUser.update({
        where: { id: existing.id },
        data: {
          emailVerified: new Date(),
          passwordHash,
        },
        select: { id: true, username: true },
      })
    : await prisma.appUser.create({
        data: {
          email: configuredEmail,
          username: await resolveBootstrapUsername(configuredEmail),
          displayName: process.env.ADMIN_BOOTSTRAP_DISPLAY_NAME?.trim() || "AllFantasy Admin",
          emailVerified: new Date(),
          passwordHash,
        },
        select: { id: true, username: true },
      })

  console.info("[admin-bootstrap] completed", {
    userId: user.id,
    email: maskBootstrapEmail(configuredEmail),
    created: !existing,
  })

  const response = NextResponse.json({
    ok: true,
    userId: user.id,
    username: user.username,
    next: "/admin",
    reminder: "Disable ADMIN_BOOTSTRAP_ENABLED in Vercel immediately after confirming admin access.",
  })

  response.cookies.set(
    "admin_session",
    signAdminSessionCookie({
      authenticated: true,
      id: user.id,
      email: configuredEmail,
      role: "admin",
      expiresAt: Date.now() + 60 * 60 * 1000,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    }
  )

  return response
}
