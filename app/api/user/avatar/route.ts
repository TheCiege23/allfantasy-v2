import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  isAllowedProfileImageType,
  persistProfileImageBytes,
} from "@/lib/avatar/ProfileImageUploadStorageService"

/** Settings page enforces 2MB; legacy `/api/user/profile/avatar` may allow 3MB. */
const MAX_BYTES = 2 * 1024 * 1024

/**
 * POST /api/user/avatar
 * Upload profile image to Vercel Blob; sets `AppUser.avatarUrl`.
 */
export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

    if (!isAllowedProfileImageType(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, GIF, WebP allowed" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const { url } = await persistProfileImageBytes({
      bytes,
      mimeType: file.type,
      originalFilename: file.name,
    })
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
