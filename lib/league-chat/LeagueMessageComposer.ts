/**
 * LeagueMessageComposer — validation and keyboard behavior for league chat input.
 * Re-exports chat-core composer for consistency; add league-specific rules here if needed.
 */

import {
  validateMessageBody,
  MAX_MESSAGE_LENGTH,
  MIN_MESSAGE_LENGTH,
  isSendKey,
  handleComposerKeyDown,
} from "@/lib/chat-core"

export { validateMessageBody, MAX_MESSAGE_LENGTH, MIN_MESSAGE_LENGTH, isSendKey, handleComposerKeyDown }
