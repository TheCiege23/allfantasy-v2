/**
 * League chat — service, composer, system notices, pinned, mentions, poll, notifications.
 */

export {
  getLeagueChatMessagesUrl,
  getLeagueChatPinnedUrl,
  getLeagueChatSendPayload,
  getLeagueChatPinPayload,
  getLeagueChatBroadcastPayload,
  isLeagueVirtualChat,
  LEAGUE_CHAT_MESSAGES_LIMIT,
  LEAGUE_CHAT_POLL_INTERVAL_MS,
} from "./LeagueChatService"

export {
  validateMessageBody,
  MAX_MESSAGE_LENGTH,
  MIN_MESSAGE_LENGTH,
  isSendKey,
  handleComposerKeyDown,
} from "./LeagueMessageComposer"

export {
  isLeagueSystemNotice,
  getLeagueSystemNoticeLabel,
  getBroadcastBody,
  getStatsBotPayload,
  getPinReferencedMessageId,
  LEAGUE_SYSTEM_MESSAGE_TYPES,
} from "./LeagueSystemNoticeRenderer"
export type { LeagueSystemMessageType } from "./LeagueSystemNoticeRenderer"

export {
  getPinnedDisplayBody,
  getReferencedMessageIdFromPin,
} from "./PinnedLeagueMessageResolver"

export { parseMentions, hasMentions } from "./LeagueMentionResolver"

export {
  createLeaguePollPayload,
  isPollMessage,
  LEAGUE_POLL_MAX_OPTIONS,
  LEAGUE_POLL_QUESTION_MAX_LENGTH,
  LEAGUE_POLL_OPTION_MAX_LENGTH,
} from "./LeaguePollService"

export { LEAGUE_CHAT_MENTIONS_ENDPOINT, getMentionsPayload } from "./LeagueChatNotificationBridge"
