/**
 * Unified chat core — room resolution, message query, composer, presence, sport context.
 */

export {
  resolveChatRoom,
  isLeagueVirtualRoom,
  getLeagueIdFromVirtualRoom,
  bracketMessageToPlatformShape,
  shouldFetchMessagesFromBracketLeague,
  getLeagueIdForRoom,
} from "./ChatCoreService"
export { isAiVirtualRoom } from "./ChatRoomResolver"
export type { ResolvedChatRoom } from "./ChatRoomResolver"
export type { ChatRoomSource } from "./ChatRoomResolver"

export {
  getMessageQueryOptions,
  clampLimit,
  parseCursor,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
} from "./MessageQueryService"
export type { MessageQueryOptions } from "./MessageQueryService"

export {
  validateMessageBody,
  isSendKey,
  handleComposerKeyDown,
  MAX_MESSAGE_LENGTH,
  MIN_MESSAGE_LENGTH,
} from "./MessageComposerController"

export {
  getPollIntervalMs,
  DEFAULT_POLL_INTERVAL_MS,
  FAST_POLL_INTERVAL_MS,
} from "./RealtimeMessageService"

export {
  SUPPORTED_CHAT_SPORTS,
  resolveSportForChatRoom,
  getDefaultChatSport,
  isSportScopedRoomType,
} from "./SportChatContextResolver"

export { getPresenceStatus } from "./ChatPresenceResolver"
export type { ChatPresence, PresenceStatus } from "./ChatPresenceResolver"
