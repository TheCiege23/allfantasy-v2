/**
 * Pure helper: build share URLs for SMS, email, Twitter, Reddit, Discord.
 * Safe to import from client components (no Prisma).
 */

export function buildInviteShareUrl(
  inviteLink: string,
  channel: "sms" | "email" | "twitter" | "reddit" | "discord",
  options?: { message?: string; subject?: string }
): string {
  const message = options?.message ?? "Join my bracket pool on AllFantasy!"
  const encodedUrl = encodeURIComponent(inviteLink)
  const encodedText = encodeURIComponent(message)

  switch (channel) {
    case "sms":
      return `sms:?body=${encodedText}%20${encodedUrl}`
    case "email":
      return `mailto:?subject=${encodeURIComponent(options?.subject ?? "Join my bracket pool")}&body=${encodedText}%0A%0A${encodedUrl}`
    case "twitter":
      return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
    case "reddit":
      return `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedText}`
    case "discord":
      return inviteLink
    default:
      return inviteLink
  }
}
