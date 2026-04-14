/**
 * Client-side service for Chimmy conversation persistence.
 * Handles saving, loading, listing, and deleting conversations.
 */

export interface ChimmyConversation {
  id: string
  title: string
  messageCount: number
  lastMessageAt: string
  createdAt: string
  updatedAt: string
}

export interface ChimmyConversationWithMessages extends ChimmyConversation {
  messages: Array<{
    id: string
    conversationId: string
    role: 'user' | 'assistant'
    content: string
    meta?: Record<string, unknown> | null
    createdAt: string
  }>
}

export interface ConversationListResponse {
  conversations: ChimmyConversation[]
  total: number
  limit: number
  offset: number
}

/**
 * List user's saved conversations
 */
export async function listChimmyConversations(
  limit = 20,
  offset = 0
): Promise<ConversationListResponse> {
  const response = await fetch(
    `/api/chimmy/conversations?limit=${limit}&offset=${offset}`,
    { method: 'GET' }
  )

  if (!response.ok) {
    throw new Error(`Failed to list conversations: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Create a new conversation (save current thread)
 */
export async function saveChimmyConversation(
  title: string,
  messageCount: number
): Promise<ChimmyConversation> {
  const response = await fetch('/api/chimmy/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, messageCount }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(
      err.error || `Failed to save conversation: ${response.statusText}`
    )
  }

  return response.json()
}

/**
 * Load a conversation with all messages
 */
export async function loadChimmyConversation(
  id: string
): Promise<ChimmyConversationWithMessages> {
  const response = await fetch(`/api/chimmy/conversations/${id}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Failed to load conversation: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Update conversation title
 */
export async function updateChimmyConversation(
  id: string,
  title: string
): Promise<ChimmyConversation> {
  const response = await fetch(`/api/chimmy/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(
      err.error || `Failed to update conversation: ${response.statusText}`
    )
  }

  return response.json()
}

/**
 * Delete a conversation
 */
export async function deleteChimmyConversation(id: string): Promise<void> {
  const response = await fetch(`/api/chimmy/conversations/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Failed to delete conversation: ${response.statusText}`)
  }
}
