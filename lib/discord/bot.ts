/**
 * Discord REST API (v10) — bot token only. No discord.js (serverless-friendly).
 */

const DISCORD_BASE = 'https://discord.com/api/v10'

export type DiscordEmbed = {
  title?: string
  description?: string
  color?: number
  author?: { name: string; icon_url?: string }
  image?: { url: string }
  footer?: { text: string }
  timestamp?: string
}

function botHeaders(): HeadersInit {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) throw new Error('DISCORD_BOT_TOKEN not set')
  return {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json',
  }
}

export function isBotConfigured(): boolean {
  return Boolean(process.env.DISCORD_BOT_TOKEN?.trim())
}

let cachedBotUserId: string | null = null

/** Bot's own user id (for loop prevention when polling messages). */
export async function getBotUserId(): Promise<string | null> {
  if (cachedBotUserId) return cachedBotUserId
  if (!isBotConfigured()) return null
  const res = await fetch(`${DISCORD_BASE}/users/@me`, { headers: botHeaders() })
  if (!res.ok) return null
  const data = (await res.json()) as { id?: string }
  if (data.id) {
    cachedBotUserId = data.id
    return data.id
  }
  return null
}

type DiscordChannel = {
  id: string
  name?: string
  type: number
  parent_id?: string | null
}

export async function ensureCategory(guildId: string): Promise<string> {
  const res = await fetch(`${DISCORD_BASE}/guilds/${guildId}/channels`, { headers: botHeaders() })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`ensureCategory: ${res.status} ${t.slice(0, 200)}`)
  }
  const channels = (await res.json()) as DiscordChannel[]
  const existing = channels.find((c) => c.type === 4 && c.name === 'AllFantasy Leagues')
  if (existing?.id) return existing.id

  const create = await fetch(`${DISCORD_BASE}/guilds/${guildId}/channels`, {
    method: 'POST',
    headers: botHeaders(),
    body: JSON.stringify({
      name: 'AllFantasy Leagues',
      type: 4,
    }),
  })
  if (!create.ok) {
    const t = await create.text()
    throw new Error(`create category: ${create.status} ${t.slice(0, 200)}`)
  }
  const cat = (await create.json()) as { id: string }
  return cat.id
}

function slugifyLeagueName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 99) || 'league-chat'
}

export async function createLeagueChannel(
  guildId: string,
  leagueName: string
): Promise<{ channelId: string; channelName: string }> {
  const parentId = await ensureCategory(guildId)
  const name = slugifyLeagueName(leagueName)
  const res = await fetch(`${DISCORD_BASE}/guilds/${guildId}/channels`, {
    method: 'POST',
    headers: botHeaders(),
    body: JSON.stringify({
      type: 0,
      name,
      parent_id: parentId,
      topic: 'League chat synced from AllFantasy.ai 🏈',
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`createLeagueChannel: ${res.status} ${t.slice(0, 200)}`)
  }
  const ch = (await res.json()) as { id: string; name?: string }
  return { channelId: ch.id, channelName: ch.name ?? name }
}

export async function postMessage(
  channelId: string,
  content: string,
  embeds?: DiscordEmbed[]
): Promise<string> {
  const payload: Record<string, unknown> = {}
  if (content) payload.content = content
  else if (embeds?.length) payload.content = '\u200b'
  else payload.content = ''
  payload.embeds = embeds?.length ? embeds : []
  const res = await fetch(`${DISCORD_BASE}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: botHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`postMessage: ${res.status} ${t.slice(0, 200)}`)
  }
  const data = (await res.json()) as { id: string }
  return data.id
}

export async function postLeagueChatEmbed(
  channelId: string,
  opts: {
    authorName: string
    authorAvatar?: string
    text: string
    gifUrl?: string
    leagueName: string
    leagueId: string
  }
): Promise<string> {
  const embed: DiscordEmbed = {
    author: {
      name: opts.authorName,
      ...(opts.authorAvatar ? { icon_url: opts.authorAvatar } : {}),
    },
    description: opts.text,
    color: 0x06b6d4,
    footer: { text: `${opts.leagueName} · AllFantasy.ai` },
    timestamp: new Date().toISOString(),
    ...(opts.gifUrl ? { image: { url: opts.gifUrl } } : {}),
  }
  return postMessage(channelId, '', [embed])
}

export async function postNotificationEmbed(
  channelId: string,
  _type: 'trade' | 'waiver' | 'injury' | 'chimmy',
  title: string,
  description: string,
  color = 0x5865f2
): Promise<void> {
  await postMessage(channelId, '', [
    {
      title,
      description,
      color,
      timestamp: new Date().toISOString(),
    },
  ])
}

export async function createWebhook(
  channelId: string,
  name = 'AllFantasy'
): Promise<{ id: string; token: string }> {
  const res = await fetch(`${DISCORD_BASE}/channels/${channelId}/webhooks`, {
    method: 'POST',
    headers: botHeaders(),
    body: JSON.stringify({ name }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`createWebhook: ${res.status} ${t.slice(0, 200)}`)
  }
  const w = (await res.json()) as { id: string; token: string }
  return { id: w.id, token: w.token }
}

export type DiscordApiMessage = {
  id: string
  content: string
  author?: { id: string; username?: string; global_name?: string | null; avatar?: string | null }
  embeds?: unknown[]
}

export async function fetchChannelMessages(
  channelId: string,
  query: { after?: string; limit?: number }
): Promise<DiscordApiMessage[]> {
  const u = new URL(`${DISCORD_BASE}/channels/${channelId}/messages`)
  if (query.after) u.searchParams.set('after', query.after)
  u.searchParams.set('limit', String(Math.min(query.limit ?? 10, 10)))
  const res = await fetch(u.toString(), { headers: botHeaders() })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`fetchChannelMessages: ${res.status} ${t.slice(0, 200)}`)
  }
  return (await res.json()) as DiscordApiMessage[]
}
