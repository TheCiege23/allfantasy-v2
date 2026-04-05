/**
 * Server + shared helpers: @mention parsing and private-message visibility.
 */

export function filterPrivateMessages<T extends { isPrivate?: boolean | null; visibleToUserId?: string | null }>(
  messages: T[],
  requestingUserId: string
): T[] {
  return messages.filter((msg) => {
    if (!msg.isPrivate) return true
    return msg.visibleToUserId === requestingUserId
  })
}

export function isChimmyPrivateMessage(text: string): boolean {
  const t = text.trim()
  return /^@chimmy\b/i.test(t) || t.toLowerCase().startsWith('@chimmy')
}

/** Strip leading @chimmy and whitespace for AI prompt. */
export function stripChimmyMentionPrefix(text: string): string {
  return text.replace(/^\s*@chimmy\b\s*/i, '').trim()
}

export function parseAtMentions(text: string): {
  hasGlobal: boolean
  hasChimmy: boolean
  hasAll: boolean
  userMentions: string[]
} {
  return {
    hasGlobal: /@global\b/i.test(text),
    hasChimmy: /@chimmy\b/i.test(text),
    hasAll: /@all\b/i.test(text),
    userMentions: [...text.matchAll(/@([a-zA-Z0-9_]+)/g)]
      .map((m) => m[1]!)
      .filter((u) => !['global', 'chimmy', 'all'].includes(u.toLowerCase())),
  }
}
