/**
 * Client-side profile image upload: calls POST /api/user/profile/avatar and returns URL.
 * Used by profile/settings upload button.
 */

const AVATAR_UPLOAD_API = "/api/user/profile/avatar"

export interface UploadResult {
  ok: boolean
  url?: string
  error?: string
}

export async function uploadProfileImage(file: File): Promise<UploadResult> {
  if (file.size > 3 * 1024 * 1024) {
    return { ok: false, error: "File too large (max 3MB)" }
  }
  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"]
  if (!allowed.includes(file.type)) {
    return { ok: false, error: "Only JPEG, PNG, GIF, WebP allowed" }
  }

  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch(AVATAR_UPLOAD_API, {
    method: "POST",
    body: formData,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: data?.error ?? "Upload failed" }
  }
  return { ok: true, url: data?.url }
}
