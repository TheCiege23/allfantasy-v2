/**
 * Conversations — DM and group chat services, list resolver, creation, unread, settings.
 */

export {
  CONVERSATION_TYPE_DIRECT,
  getCreateDMPayload,
  getCreateDMUrl,
  getThreadMessagesUrl,
} from "./DirectMessageService"

export {
  CONVERSATION_TYPE_GROUP,
  getCreateGroupPayload,
  getCreateGroupUrl,
  GROUP_MIN_MEMBERS,
  GROUP_MAX_MEMBERS,
} from "./GroupMessageService"

export {
  filterThreadsByType,
  getDMThreads,
  getGroupThreads,
  sortThreadsByLastMessage,
  getConversationDisplayTitle,
  getConversationPreview,
} from "./ConversationListResolver"
export type { ConversationType } from "./ConversationListResolver"

export {
  validateDMParticipant,
  getCreateDMPayloadSafe,
  validateGroupParticipants,
  getCreateGroupPayloadSafe,
} from "./ConversationCreationController"

export {
  getParticipantDisplayName,
  PARTICIPANT_SEARCH_MIN_QUERY,
  canSearchParticipants,
  parseParticipantUsernames,
  filterParticipantsByQuery,
} from "./ParticipantSelectorService"

export {
  getUnreadCount,
  hasUnread,
  getUnreadBadgeLabel,
} from "./ConversationUnreadResolver"

export {
  getLeaveGroupUrl,
  getAddParticipantsUrl,
  getRenameThreadUrl,
  getMuteThreadUrl,
  getRenamePayload,
} from "./ConversationSettingsService"

export { handleComposerKeyDown } from "@/lib/chat-core"
