/**
 * ConversationSettingsService — leave group, rename, mute endpoints and payloads.
 */

export function getLeaveGroupUrl(threadId: string): string {
  return `/api/shared/chat/threads/${encodeURIComponent(threadId)}/leave`
}

export function getAddParticipantsUrl(threadId: string): string {
  return `/api/shared/chat/threads/${encodeURIComponent(threadId)}/members`
}

export function getRenameThreadUrl(threadId: string): string {
  return `/api/shared/chat/threads/${encodeURIComponent(threadId)}`
}

export function getMuteThreadUrl(threadId: string): string {
  return `/api/shared/chat/threads/${encodeURIComponent(threadId)}/mute`
}

export function getRenamePayload(title: string): { title: string } {
  return { title: title.trim().slice(0, 100) }
}
