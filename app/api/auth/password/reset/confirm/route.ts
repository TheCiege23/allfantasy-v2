import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { sha256Hex, isStrongPassword } from "@/lib/tokens"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const token = String(body?.token || "")
  const email = String(body?.email || "").trim().toLowerCase()
  let phone = String(body?.phone || "").trim().replace(/[\s()-]/g, "")
  if (phone && !phone.startsWith("+")) phone = "+1" + phone
  const code = String(body?.code || "").trim()
  const newPassword = String(body?.newPassword || "")

  if (!newPassword) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 })
  }
  if (!isStrongPassword(newPassword)) {
    return NextResponse.json({ error: "WEAK_PASSWORD" }, { status: 400 })
  }

  let userId: string

  if (phone && code) {
    const profile = await (prisma as any).userProfile.findUnique({
      where: { phone },
      select: { userId: true },
    }).catch(() => null)
    if (!profile) {
      return NextResponse.json({ error: "INVALID_OR_USED_TOKEN" }, { status: 400 })
    }
    const tokenHash = sha256Hex(code)
    const row = await (prisma as any).passwordResetToken.findFirst({
      where: { userId: profile.userId, tokenHash },
    }).catch(() => null)
    if (!row) {
      return NextResponse.json({ error: "INVALID_OR_USED_TOKEN" }, { status: 400 })
    }
    if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
      await (prisma as any).passwordResetToken.deleteMany({
        where: { userId: profile.userId, tokenHash },
      }).catch(() => {})
      return NextResponse.json({ error: "EXPIRED_TOKEN" }, { status: 400 })
    }
    userId = row.userId
    const passwordHash = await bcrypt.hash(newPassword, 12)
    try {
      await (prisma as any).$transaction(async (tx: any) => {
        await tx.appUser.update({
          where: { id: userId },
          data: { passwordHash },
        })
        await tx.passwordResetToken.deleteMany({
          where: { userId, tokenHash },
        })
      })
    } catch (txErr) {
      console.error("[password/reset/confirm] SMS transaction failed:", txErr)
      return NextResponse.json({ error: "RESET_FAILED" }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (email && code) {
    const user = await (prisma as any).appUser.findUnique({
      where: { email },
      select: { id: true },
    }).catch(() => null)
    if (!user) {
      return NextResponse.json({ error: "INVALID_OR_USED_TOKEN" }, { status: 400 })
    }
    const tokenHash = sha256Hex(code)
    const row = await (prisma as any).passwordResetToken.findFirst({
      where: { userId: user.id, tokenHash },
    }).catch(() => null)
    if (!row) {
      return NextResponse.json({ error: "INVALID_OR_USED_TOKEN" }, { status: 400 })
    }
    if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
      await (prisma as any).passwordResetToken.deleteMany({
        where: { userId: user.id, tokenHash },
      }).catch(() => {})
      return NextResponse.json({ error: "EXPIRED_TOKEN" }, { status: 400 })
    }
    userId = row.userId
    const passwordHash = await bcrypt.hash(newPassword, 12)
    try {
      await (prisma as any).$transaction(async (tx: any) => {
        await tx.appUser.update({
          where: { id: userId },
          data: { passwordHash },
        })
        await tx.passwordResetToken.deleteMany({
          where: { userId, tokenHash },
        })
      })
    } catch (txErr) {
      console.error("[password/reset/confirm] Email-code transaction failed:", txErr)
      return NextResponse.json({ error: "RESET_FAILED" }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (!token) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 })
  }

  const tokenHash = sha256Hex(token)

  const row = await (prisma as any).passwordResetToken.findUnique({
    where: { tokenHash },
  }).catch(() => null)

  if (!row) {
    return NextResponse.json({ error: "INVALID_OR_USED_TOKEN" }, { status: 400 })
  }

  if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
    await (prisma as any).passwordResetToken.delete({ where: { tokenHash } }).catch(() => {})
    return NextResponse.json({ error: "EXPIRED_TOKEN" }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)

  try {
    await (prisma as any).$transaction(async (tx: any) => {
      await tx.appUser.update({
        where: { id: row.userId },
        data: { passwordHash },
      })

      await tx.passwordResetToken.delete({
        where: { tokenHash },
      })
    })
  } catch (txErr) {
    console.error("[password/reset/confirm] Transaction failed:", txErr)
    return NextResponse.json({ error: "RESET_FAILED" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
