/**
 * MessageComposerController — send validation, max length, and enter-key behavior.
 */

export const MAX_MESSAGE_LENGTH = 1000
export const MIN_MESSAGE_LENGTH = 1

export function validateMessageBody(body: string): { valid: boolean; error?: string } {
  const trimmed = typeof body === "string" ? body.trim() : ""
  if (trimmed.length < MIN_MESSAGE_LENGTH) return { valid: false, error: "Message required" }
  if (trimmed.length > MAX_MESSAGE_LENGTH) return { valid: false, error: "Message too long" }
  return { valid: true }
}

/** Whether Enter (without Shift) should send. Used by frontend. */
export function isSendKey(e: React.KeyboardEvent): boolean {
  return e.key === "Enter" && !e.shiftKey
}

/** Prevent default and send when Enter without Shift. */
export function handleComposerKeyDown(
  e: React.KeyboardEvent,
  onSend: () => void,
  canSend: boolean
): void {
  if (!isSendKey(e)) return
  if (!canSend) return
  e.preventDefault()
  onSend()
}
