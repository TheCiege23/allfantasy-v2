/**
 * Seed ChatGif + ChatEmoji for league chat composer.
 *
 * Run: npx tsx prisma/seeds/chat-media.ts
 * (or import `seedChatMedia` from main prisma/seed.ts)
 *
 * ── Future migration SQL (apply when ready to add first-class columns on league_chat_messages) ──
 * ALTER TABLE "league_chat_messages" ADD COLUMN IF NOT EXISTS "gifId" TEXT;
 * ALTER TABLE "league_chat_messages" ADD COLUMN IF NOT EXISTS "attachments" JSONB;
 * ALTER TABLE "league_chat_messages" ADD COLUMN IF NOT EXISTS "poll" JSONB;
 * ALTER TABLE "league_chat_messages" ADD CONSTRAINT "league_chat_messages_gifId_fkey"
 *   FOREIGN KEY ("gifId") REFERENCES "chat_gifs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
 * CREATE INDEX IF NOT EXISTS "league_chat_messages_gifId_idx" ON "league_chat_messages"("gifId");
 *
 * Until then, rich payloads are stored in `metadata` JSON.
 */

import type { PrismaClient } from '@prisma/client'

const GIF_SEED: Array<{
  giphyId: string
  title: string
  category: string
  tags: string[]
  width?: number
  height?: number
}> = [
  { giphyId: 'l0MYt5jPR6QX5pnqM', title: 'Victory dance', category: 'celebration', tags: ['win', 'dance', 'victory'] },
  { giphyId: '3oz8xIsloV7zOmt81G', title: 'Lets go!', category: 'celebration', tags: ['excited', 'lets go'] },
  { giphyId: 'l3vRnkCFGlMxNJsGk', title: 'Trophy celebration', category: 'celebration', tags: ['trophy', 'win', 'champion'] },
  { giphyId: 'xT5LMFZDsj0AKJJSF6', title: 'Championship belt', category: 'celebration', tags: ['champion', 'belt', 'win'] },
  { giphyId: 'g9582DNuQppxC', title: 'Bane', category: 'trash-talk', tags: ['bane', 'villain'] },
  { giphyId: '3oEjHAUOqG3lSS0f1C', title: 'Crying laughing', category: 'reaction', tags: ['laugh', 'crying', 'funny'] },
  { giphyId: 'H5C8CevNMbpBqNqFjl', title: 'Patrick Mahomes', category: 'sports', tags: ['mahomes', 'nfl', 'football'] },
  { giphyId: 'dykJjWgPbMRBFEOFnx', title: 'Odell catch', category: 'sports', tags: ['odell', 'catch', 'nfl'] },
  { giphyId: 'l0HlPystfePnAI3G8', title: 'Drake approved', category: 'reaction', tags: ['drake', 'approve', 'yes'] },
  { giphyId: 'xT0xeJpnrWC4XWblEk', title: 'Not impressed', category: 'reaction', tags: ['nope', 'unimpressed'] },
  { giphyId: '3oEjI6SIIHBdRxXI40', title: 'Boom!', category: 'celebration', tags: ['boom', 'explosion', 'hype'] },
  { giphyId: 'LmNwrBhejkK9EFP504', title: 'Oof', category: 'reaction', tags: ['oof', 'hurt', 'ouch'] },
  { giphyId: '7NoNw4pMNTvgc', title: 'Shaq laugh', category: 'reaction', tags: ['shaq', 'laugh', 'nba'] },
  { giphyId: '3o7TKSjRrfIPjeiVyM', title: 'Waiver wire', category: 'fantasy', tags: ['waiver', 'add', 'pickup'] },
  { giphyId: 'xUPGcguWZHRC2HyBRS', title: 'Trade rejected', category: 'fantasy', tags: ['no', 'rejected', 'trade'] },
  { giphyId: '26BRv0ThflsHCqDrG', title: 'Touchdown spike', category: 'sports', tags: ['td', 'touchdown', 'nfl'] },
  { giphyId: '26ufdipCq59upw8z6', title: 'Field goal', category: 'sports', tags: ['kick', 'fg', 'nfl'] },
  { giphyId: '3o7btPCcdNniyf0ArS', title: 'Interception', category: 'sports', tags: ['pick', 'defense', 'nfl'] },
  { giphyId: 'l0MYC0LajbaPoEADu', title: 'Fumble', category: 'sports', tags: ['fumble', 'turnover'] },
  { giphyId: '3ohzdIuqJoo6QdKdqU', title: 'Injury cart', category: 'injury', tags: ['injury', 'hurt', 'medical'] },
  { giphyId: 'l3q2K5jinAlChoCLS', title: 'Draft day', category: 'fantasy', tags: ['draft', 'pick', 'rookie'] },
  { giphyId: 'xUO4t2gkWBxDi', title: 'Trash talk', category: 'trash-talk', tags: ['talk', 'smack'] },
  { giphyId: '3o7aCTPPm4OHfRLSH6', title: 'Mic drop', category: 'celebration', tags: ['mic', 'drop', 'win'] },
  { giphyId: 'l0HlNQ03J5JxX6lva', title: 'Fantasy points', category: 'fantasy', tags: ['points', 'score', 'ppr'] },
  { giphyId: '3o6ZtpXBXBbmJYw12U', title: 'Sleeper pick', category: 'fantasy', tags: ['sleeper', 'steal'] },
  { giphyId: '26uf3GPe3MqUf6J8k', title: 'Hail Mary', category: 'sports', tags: ['hail', 'pass', 'nfl'] },
  { giphyId: 'l0MYKaW5dfUmM3hXa', title: 'Red zone', category: 'sports', tags: ['redzone', 'td'] },
  { giphyId: '3o7btLw0Yt0DT9i0dG', title: 'QB run', category: 'sports', tags: ['qb', 'run', 'nfl'] },
  { giphyId: 'xT4uQulxzU39HRFpDM', title: 'Stiff arm', category: 'sports', tags: ['stiff', 'rb', 'nfl'] },
  { giphyId: 'l3vR4BovnS8h7kR8s0', title: 'One-handed catch', category: 'sports', tags: ['catch', 'wr', 'nfl'] },
  { giphyId: '3o7aD2saalBwwftBIY', title: 'Sack celebration', category: 'sports', tags: ['sack', 'defense'] },
  { giphyId: '3o7btNRZg7Yv8Z7v0s', title: 'Coach headset', category: 'sports', tags: ['coach', 'nfl'] },
  { giphyId: 'l0HlN7cGv0pG2J5Y8', title: 'Replay flag', category: 'sports', tags: ['flag', 'review', 'ref'] },
  { giphyId: 'xT5LMzFx1F7W1xjqHW', title: 'Waiver claim', category: 'fantasy', tags: ['claim', 'faab'] },
  { giphyId: '3o7aD3n2gU5qFvUv0s', title: 'Bench mob', category: 'fantasy', tags: ['bench', 'depth'] },
  { giphyId: '3o7btXjqfcmseDjIFG', title: 'Start sit', category: 'fantasy', tags: ['start', 'sit', 'lineup'] },
  { giphyId: '3o7aC6q1VUP6g5gY5K', title: 'Playoffs push', category: 'fantasy', tags: ['playoffs', 'postseason'] },
  { giphyId: '3o7btZR3NfY8qYv5Y0', title: 'Championship run', category: 'fantasy', tags: ['ship', 'final'] },
  { giphyId: 'Gi0Tdvh8bIqCs', title: 'NFL hype', category: 'sports', tags: ['nfl', 'hype'] },
  { giphyId: 'l0Mycuj6Y08sO7k2Y', title: 'Game time', category: 'sports', tags: ['game', 'clock'] },
]

function giphyUrls(giphyId: string) {
  return {
    url: `https://media.giphy.com/media/${giphyId}/giphy.gif`,
    previewUrl: `https://media.giphy.com/media/${giphyId}/giphy_s.gif`,
  }
}

/** Emoji rows: category keys match picker tabs */
const EMOJI_ROWS: Array<{
  char: string
  name: string
  shortcode: string
  category: string
  tags: string[]
  sortOrder: number
}> = []

const CAT = {
  smileys_people: ['😀', '😂', '🤣', '😍', '🥹', '😎', '🤔', '😤', '😡', '🤯', '🥳', '🫡', '🫠', '😴', '💀', '👻', '🙂', '😉', '😘', '🥲', '🤠', '🥸', '😇', '🤡', '🤥', '🫢', '🫣', '🥶', '🥵', '😮', '🤩'],
  sports: ['🏈', '⚽', '🏀', '🎯', '🏆', '🥇', '🏅', '🎲', '🎮', '⚾', '🏒', '🎾', '🏊', '🤸', '🏋️', '🤼', '🏉', '🥊', '🛼', '⛳', '🎳', '🎱', '🏓', '🥌', '🎿', '⛷️', '🏂', '🚴', '🏇', '🤺'],
  gestures: ['👍', '👎', '🤝', '🤜', '🙌', '👏', '🫶', '💪', '🤞', '🤙', '🖕', '🤲', '☝️', '✌️', '🫵', '🙏', '✋', '👋', '🤚', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '✊', '👊', '🤛', '🤜', '👐'],
  nature: ['🔥', '💥', '⚡', '🌊', '🌪️', '❄️', '🌙', '⭐', '🌟', '💫', '🎆', '🌈', '☀️', '🌤️', '⛈️', '🌧️', '☂️', '🌨️', '☃️', '⛄', '🌲', '🌳', '🌴', '🌵', '🍀', '🌻', '🌺', '🌸', '🌼', '🌷'],
  food: ['🍕', '🍔', '🌮', '🍺', '🥂', '🍾', '🎂', '🧁', '🍩', '🍿', '🥤', '☕', '🍻', '🥃', '🍷', '🍇', '🍎', '🍊', '🍋', '🍌', '🍉', '🍓', '🥑', '🌶️', '🥓', '🍳', '🥞', '🧇', '🥗', '🍜'],
  objects: ['💰', '💎', '📱', '💻', '🎤', '🎵', '🎸', '🏟️', '📊', '📈', '📉', '🔔', '📣', '💬', '🗂️', '📎', '✏️', '🖊️', '📌', '🗳️', '⚙️', '🔧', '🔨', '💡', '🔦', '🧲', '🎁', '🎀', '🎈', '🎉'],
  symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💯', '✅', '❌', '⚠️', '🔔', '📣', '💬', '♿', '⚕️', '⛔', '🚫', '🔞', '☢️', '☣️', '⬆️', '⬇️', '➡️', '⬅️', '🔄', '🔃', '🔙', '🔚'],
  flags: ['🏴‍☠️', '🚩', '🎌', '🇺🇸', '🏳️‍🌈', '🏳️‍⚧️', '🇨🇦', '🇲🇽', '🇬🇧', '🇫🇷', '🇩🇪', '🇮🇹', '🇪🇸', '🇧🇷', '🇯🇵', '🇰🇷', '🇦🇺', '🇮🇳', '🇳🇬', '🇿🇦', '🇪🇬', '🇸🇪', '🇳🇴', '🇫🇮', '🇵🇱', '🇳🇱', '🇨🇭', '🇦🇹', '🇮🇪', '🇵🇹', '🇬🇷'],
}

const seenChar = new Set<string>()
let order = 0
for (const [category, chars] of Object.entries(CAT)) {
  for (const char of chars) {
    if (seenChar.has(char)) continue
    seenChar.add(char)
    const name = `${category} emoji`
    const shortcode = `:af_${order}:`
    EMOJI_ROWS.push({
      char,
      name,
      shortcode,
      category,
      tags: [category, char],
      sortOrder: order++,
    })
  }
}

export async function seedChatMedia(prisma: PrismaClient) {
  const seenGiphy = new Set<string>()
  const gifData = GIF_SEED.filter((g) => {
    if (seenGiphy.has(g.giphyId)) return false
    seenGiphy.add(g.giphyId)
    return true
  }).map((g) => {
    const u = giphyUrls(g.giphyId)
    return {
      giphyId: g.giphyId,
      title: g.title,
      category: g.category,
      tags: g.tags,
      width: g.width ?? 480,
      height: g.height ?? 270,
      ...u,
    }
  })

  for (const row of gifData) {
    await prisma.chatGif.upsert({
      where: { giphyId: row.giphyId },
      create: row,
      update: {
        title: row.title,
        url: row.url,
        previewUrl: row.previewUrl,
        tags: row.tags,
        category: row.category,
        width: row.width,
        height: row.height,
      },
    })
  }

  for (const e of EMOJI_ROWS) {
    await prisma.chatEmoji.upsert({
      where: { char: e.char },
      create: e,
      update: {
        name: e.name,
        shortcode: e.shortcode,
        category: e.category,
        tags: e.tags,
        sortOrder: e.sortOrder,
      },
    })
  }

  return { gifs: gifData.length, emojis: EMOJI_ROWS.length }
}

async function main() {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  try {
    const r = await seedChatMedia(prisma)
    console.log('seedChatMedia OK', r)
  } finally {
    await prisma.$disconnect()
  }
}

if (typeof process !== 'undefined' && process.argv[1]?.replace(/\\/g, '/').includes('chat-media')) {
  void main()
}
