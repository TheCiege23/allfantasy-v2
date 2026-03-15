/**
 * Social chat — mentions, reactions, pins, polls.
 */

export {
  parseMentions,
  hasMentions,
  getMentionRanges,
  getMentionQueryFromInput,
} from "./MentionResolver"
export type { MentionRange } from "./MentionResolver"

export {
  MENTIONS_ENDPOINT,
  getMentionsPayload,
  notifyMentions,
} from "./MentionNotificationBridge"

export {
  getReactionsFromMetadata,
  getAddReactionUrl,
  getRemoveReactionUrl,
  QUICK_REACTIONS,
} from "./ReactionService"
export type { ReactionEntry } from "./ReactionService"

export {
  getPinnedUrl,
  getPinUrl,
  getUnpinUrl,
  getPinPayload,
  getUnpinPayload,
  getPinnedDisplayBody,
  getReferencedMessageIdFromPin,
} from "./PinnedMessageService"

export {
  isPollMessage,
  parsePollBody,
  getVoteUrl,
  getVotePayload,
  getClosePollUrl,
  getCreatePollPayload,
  POLL_MAX_OPTIONS,
  POLL_QUESTION_MAX_LENGTH,
  POLL_OPTION_MAX_LENGTH,
} from "./PollService"
export type { PollPayload } from "./PollService"

export { MessageInteractionRenderer } from "./MessageInteractionRenderer"
export type { MessageInteractionRendererProps } from "./MessageInteractionRenderer"
