import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"

const MAX_SIZE = 3 * 1024 * 1024 // 3MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

/**
 * POST /api/user/profile/avatar
 * Upload a profile image. Saves to public/uploads/avatars and sets AppUser.avatarUrl.
 * Returns { url } or error.
 */
export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, GIF, WebP allowed" }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 3MB)" }, { status: 400 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png"
    const safeExt = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext) ? ext : "png"
    const filename = `${randomUUID()}.${safeExt}`
    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars")
    await mkdir(uploadDir, { recursive: true })
    const filepath = path.join(uploadDir, filename)

    const bytes = new Uint8Array(await file.arrayBuffer())
    await writeFile(filepath, bytes)

    const url = `/uploads/avatars/${filename}`
    await prisma.appUser.update({
      where: { id: userId },
      data: { avatarUrl: url },
    })

    return NextResponse.json({ url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
