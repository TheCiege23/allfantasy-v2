import { NextRequest, NextResponse } from "next/server"
import { resolvePlatformUser } from "@/lib/platform/current-user"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"

const MAX_IMAGE = 5 * 1024 * 1024 // 5MB
const MAX_FILE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/gif", "image/webp"]
const ALLOWED_FILE = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf", "text/plain", "text/csv",
]

/**
 * POST /api/shared/chat/upload
 * Multipart formData with "file". Saves to public/uploads/chat, returns { url }.
 */
export async function POST(req: NextRequest) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

    const isImage = ALLOWED_IMAGE.includes(file.type)
    const isAllowedFile = ALLOWED_FILE.includes(file.type)
    if (!isImage && !isAllowedFile) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 })
    }
    const maxSize = isImage ? MAX_IMAGE : MAX_FILE
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: isImage ? "Image too large (max 5MB)" : "File too large (max 10MB)" },
        { status: 400 }
      )
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin"
    const safeExt = ["jpg", "jpeg", "png", "gif", "webp", "pdf", "txt", "csv"].includes(ext) ? ext : "bin"
    const filename = `${randomUUID()}.${safeExt}`
    const uploadDir = path.join(process.cwd(), "public", "uploads", "chat")
    await mkdir(uploadDir, { recursive: true })
    const filepath = path.join(uploadDir, filename)

    const bytes = new Uint8Array(await file.arrayBuffer())
    await writeFile(filepath, bytes)

    const url = `/uploads/chat/${filename}`
    return NextResponse.json({ url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
