function cleanUrl(url: string): string {
  return url.trim().replace(/\/$/, "")
}

export function getBaseUrl(): string {
  const explicit =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL

  if (explicit && explicit.trim().length > 0) {
    return cleanUrl(explicit)
  }

  const vercelUrl = process.env.VERCEL_URL?.trim()

  if (vercelUrl) {
    if (vercelUrl.startsWith("http")) {
      return cleanUrl(vercelUrl)
    }

    return `https://${cleanUrl(vercelUrl)}`
  }

  return "http://localhost:3000"
}