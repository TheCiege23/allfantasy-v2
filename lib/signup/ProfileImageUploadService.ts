export async function uploadProfileImage(file: File): Promise<{
  ok: boolean
  url?: string
  error?: string
}> {
  const formData = new FormData()
  formData.append("file", file)
  const res = await fetch("/api/user/profile/avatar", {
    method: "POST",
    body: formData,
  })
  const data = (await res.json().catch(() => ({}))) as {
    url?: string
    error?: string
  }
  if (!res.ok) {
    return { ok: false, error: data?.error || "Upload failed" }
  }
  return { ok: true, url: data?.url }
}
