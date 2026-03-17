/**
 * Share URLs for invite link (copy, SMS, email, X, Discord, Reddit, WhatsApp).
 * Safe for client (no Prisma).
 */

export type InviteShareChannel =
  | 'copy_link'
  | 'sms'
  | 'email'
  | 'twitter'
  | 'x'
  | 'discord'
  | 'reddit'
  | 'whatsapp'

export function buildInviteShareUrl(
  inviteUrl: string,
  channel: InviteShareChannel,
  options?: { message?: string; subject?: string }
): string {
  const message = options?.message ?? 'Join me on AllFantasy!'
  const encodedUrl = encodeURIComponent(inviteUrl)
  const encodedText = encodeURIComponent(message)

  switch (channel) {
    case 'sms':
      return `sms:?body=${encodedText}%20${encodedUrl}`
    case 'email':
      return `mailto:?subject=${encodeURIComponent(options?.subject ?? 'Join me on AllFantasy')}&body=${encodedText}%0A%0A${encodedUrl}`
    case 'twitter':
    case 'x':
      return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
    case 'reddit':
      return `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedText}`
    case 'whatsapp':
      return `https://wa.me/?text=${encodedText}%20${encodedUrl}`
    case 'discord':
      return inviteUrl
    case 'copy_link':
    default:
      return inviteUrl
  }
}
