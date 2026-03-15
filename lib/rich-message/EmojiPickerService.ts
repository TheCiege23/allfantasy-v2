/**
 * EmojiPickerService — common emoji list and insert-at-cursor helpers for chat composer.
 */

export const EMOJI_CATEGORIES = ["recent", "smileys", "gestures", "hearts", "objects", "symbols"] as const

/** Common emojis for quick picker (no external dependency). */
export const EMOJI_LIST: string[] = [
  "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂",
  "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋",
  "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐",
  "👍", "👎", "👏", "🙌", "👐", "🤝", "🙏", "✌️", "🤞", "🤟",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
  "🔥", "⭐", "✨", "💯", "🎉", "🏆", "⚽", "🏀", "🎯", "📌",
]

export function insertEmojiAtPosition(text: string, emoji: string, position: number): string {
  const before = text.slice(0, position)
  const after = text.slice(position)
  return before + emoji + after
}

export function appendEmoji(text: string, emoji: string): string {
  return text + emoji
}

export function getEmojiCategoryLabel(cat: (typeof EMOJI_CATEGORIES)[number]): string {
  switch (cat) {
    case "recent": return "Recent"
    case "smileys": return "Smileys"
    case "gestures": return "Gestures"
    case "hearts": return "Hearts"
    case "objects": return "Objects"
    case "symbols": return "Symbols"
    default: return String(cat)
  }
}
