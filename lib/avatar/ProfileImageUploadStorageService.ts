import { randomUUID } from "crypto"
import { put } from "@vercel/blob"

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

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Storage not configured")
  }

  const fileFromName = params.originalFilename?.split(".").pop()?.toLowerCase() ?? ""
  const canonical = MIME_EXTENSION_MAP[params.mimeType]
  const ext = ["jpg", "jpeg", "png", "gif", "webp"].includes(fileFromName)
    ? fileFromName
    : canonical
  const filename = `${randomUUID()}.${ext}`
  const key = `avatars/${filename}`

  const body = Buffer.from(params.bytes)

  const blob = await put(key, body, {
    access: "public",
    contentType: params.mimeType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })

  return { url: blob.url }
}
