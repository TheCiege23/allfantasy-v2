/**
 * ConversationCreationController — validate and build payload for creating DM or group.
 */

import { getCreateDMPayload } from "./DirectMessageService"
import { getCreateGroupPayload, GROUP_MIN_MEMBERS, GROUP_MAX_MEMBERS } from "./GroupMessageService"

export function validateDMParticipant(otherUserId: string, currentUserId: string): { valid: boolean; error?: string } {
  if (!otherUserId?.trim()) return { valid: false, error: "User required" }
  if (otherUserId === currentUserId) return { valid: false, error: "Cannot message yourself" }
  return { valid: true }
}

export function getCreateDMPayloadSafe(otherUserId: string): ReturnType<typeof getCreateDMPayload> | null {
  const trimmed = otherUserId?.trim()
  if (!trimmed) return null
  return getCreateDMPayload(trimmed)
}

export function validateGroupParticipants(
  memberUserIds: string[],
  currentUserId: string
): { valid: boolean; error?: string } {
  const set = new Set([currentUserId, ...memberUserIds].filter(Boolean))
  if (set.size < GROUP_MIN_MEMBERS) return { valid: false, error: "At least 2 participants required" }
  if (set.size > GROUP_MAX_MEMBERS) return { valid: false, error: `Max ${GROUP_MAX_MEMBERS} participants` }
  return { valid: true }
}

export function getCreateGroupPayloadSafe(
  memberUserIds: string[],
  title?: string
): ReturnType<typeof getCreateGroupPayload> | null {
  const ids = memberUserIds.filter(Boolean)
  if (ids.length < 1) return null
  return getCreateGroupPayload(ids, title)
}
