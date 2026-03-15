/**
 * LeagueMentionResolver — parse @mentions from league chat text.
 * Used before send to trigger mention notifications via LeagueChatNotificationBridge (API).
 */

const MENTION_REGEX = /@(\w+)/g

export function parseMentions(text: string): string[] {
  const matches = text.match(MENTION_REGEX) || []
  return [...new Set(matches.map((m) => m.slice(1)))]
}

export function hasMentions(text: string): boolean {
  return MENTION_REGEX.test(text)
}
