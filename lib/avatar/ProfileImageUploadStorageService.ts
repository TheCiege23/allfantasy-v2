import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"

export const MAX_PROFILE_IMAGE_BYTES = 3 * 1024 * 1024
export const ALLOWED_PROFILE_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const

const MIME_EXTENSION_MAP: Record<(typeof ALLOWED_PROFILE_IMAGE_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
}

type AllowedMimeType = (typeof ALLOWED_PROFILE_IMAGE_TYPES)[number]

export function isAllowedProfileImageType(mimeType: string): mimeType is AllowedMimeType {
  return (ALLOWED_PROFILE_IMAGE_TYPES as readonly string[]).includes(mimeType)
}

export function parseAvatarDataUrl(
  dataUrl: string
): { mimeType: AllowedMimeType; bytes: Uint8Array; extension: string } | null {
  const trimmed = dataUrl.trim()
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(trimmed)
  if (!match) return null

  const mimeType = match[1]
  if (!isAllowedProfileImageType(mimeType)) return null

  try {
    const bytes = new Uint8Array(Buffer.from(match[2], "base64"))
    if (!bytes.length || bytes.byteLength > MAX_PROFILE_IMAGE_BYTES) return null
    return {
      mimeType,
      bytes,
      extension: MIME_EXTENSION_MAP[mimeType],
    }
  } catch {
    return null
  }
}

export async function persistProfileImageBytes(params: {
  bytes: Uint8Array
  mimeType: string
  originalFilename?: string | null
}): Promise<{ url: string }> {
  if (params.bytes.byteLength > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error("File too large (max 3MB)")
  }
  if (!isAllowedProfileImageType(params.mimeType)) {
    throw new Error("Only JPEG, PNG, GIF, WebP allowed")
  }

  const fileFromName = params.originalFilename?.split(".").pop()?.toLowerCase() ?? ""
  const canonical = MIME_EXTENSION_MAP[params.mimeType]
  const ext = ["jpg", "jpeg", "png", "gif", "webp"].includes(fileFromName)
    ? fileFromName
    : canonical
  const filename = `${randomUUID()}.${ext}`

  const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars")
  await mkdir(uploadDir, { recursive: true })
  const filepath = path.join(uploadDir, filename)
  await writeFile(filepath, params.bytes)

  return { url: `/uploads/avatars/${filename}` }
}
