import { prisma } from '@/lib/prisma'

const KLIPY_API_KEY = process.env.VITE_KLIPY_API_KEY?.trim() || process.env.KLIPY_API_KEY?.trim() || ''

type KlipyFileVariant = {
  gif?: { url?: string; width?: number; height?: number }
  webp?: { url?: string; width?: number; height?: number }
  jpg?: { url?: string; width?: number; height?: number }
}

type KlipyGif = {
  id: string | number
  title?: string
  tags?: unknown
  file?: {
    hd?: KlipyFileVariant
    md?: KlipyFileVariant
    sm?: KlipyFileVariant
    xs?: KlipyFileVariant
  }
  files?: {
    gif?: { url?: string; width?: number; height?: number }
    gif_small?: { url?: string }
    webp?: { url?: string }
  }
}

type NormalizedGif = {
  giphyId: string
  title: string
  url: string
  previewUrl: string
  width: number
  height: number
  tags: string[]
  category: string
}

type EmojiSeedRow = {
  char: string
  name: string
  shortcode: string
  category: string
  tags: string[]
  sortOrder: number
}

const DEFAULT_EMOJIS: EmojiSeedRow[] = [
  { char: '😀', name: 'Grinning Face', shortcode: ':grinning:', category: 'faces', tags: ['happy', 'smile'], sortOrder: 1 },
  { char: '😂', name: 'Face With Tears of Joy', shortcode: ':joy:', category: 'faces', tags: ['laugh', 'funny'], sortOrder: 2 },
  { char: '🤣', name: 'Rolling On The Floor Laughing', shortcode: ':rofl:', category: 'faces', tags: ['laugh', 'lol'], sortOrder: 3 },
  { char: '😎', name: 'Smiling Face With Sunglasses', shortcode: ':sunglasses:', category: 'faces', tags: ['cool', 'swagger'], sortOrder: 4 },
  { char: '🔥', name: 'Fire', shortcode: ':fire:', category: 'reactions', tags: ['hot', 'lit'], sortOrder: 5 },
  { char: '💯', name: 'Hundred Points', shortcode: ':100:', category: 'reactions', tags: ['perfect', 'agree'], sortOrder: 6 },
  { char: '🙌', name: 'Raising Hands', shortcode: ':raised_hands:', category: 'reactions', tags: ['celebrate', 'hype'], sortOrder: 7 },
  { char: '👏', name: 'Clapping Hands', shortcode: ':clap:', category: 'reactions', tags: ['applause', 'props'], sortOrder: 8 },
  { char: '👍', name: 'Thumbs Up', shortcode: ':thumbsup:', category: 'reactions', tags: ['yes', 'approve'], sortOrder: 9 },
  { char: '👎', name: 'Thumbs Down', shortcode: ':thumbsdown:', category: 'reactions', tags: ['no', 'disagree'], sortOrder: 10 },
  { char: '🤝', name: 'Handshake', shortcode: ':handshake:', category: 'reactions', tags: ['deal', 'respect'], sortOrder: 11 },
  { char: '🧠', name: 'Brain', shortcode: ':brain:', category: 'reactions', tags: ['smart', 'strategy'], sortOrder: 12 },
  { char: '👀', name: 'Eyes', shortcode: ':eyes:', category: 'reactions', tags: ['watching', 'look'], sortOrder: 13 },
  { char: '🚨', name: 'Police Car Light', shortcode: ':rotating_light:', category: 'reactions', tags: ['alert', 'breaking'], sortOrder: 14 },
  { char: '✅', name: 'Check Mark Button', shortcode: ':white_check_mark:', category: 'symbols', tags: ['done', 'confirm'], sortOrder: 15 },
  { char: '❌', name: 'Cross Mark', shortcode: ':x:', category: 'symbols', tags: ['wrong', 'deny'], sortOrder: 16 },
  { char: '➕', name: 'Plus', shortcode: ':heavy_plus_sign:', category: 'symbols', tags: ['add', 'positive'], sortOrder: 17 },
  { char: '➖', name: 'Minus', shortcode: ':heavy_minus_sign:', category: 'symbols', tags: ['subtract', 'negative'], sortOrder: 18 },
  { char: '🏈', name: 'American Football', shortcode: ':football:', category: 'sports', tags: ['nfl', 'touchdown'], sortOrder: 19 },
  { char: '🏀', name: 'Basketball', shortcode: ':basketball:', category: 'sports', tags: ['nba', 'hoops'], sortOrder: 20 },
  { char: '⚾', name: 'Baseball', shortcode: ':baseball:', category: 'sports', tags: ['mlb', 'bat'], sortOrder: 21 },
  { char: '🏒', name: 'Ice Hockey', shortcode: ':hockey:', category: 'sports', tags: ['nhl', 'puck'], sortOrder: 22 },
  { char: '⚽', name: 'Soccer Ball', shortcode: ':soccer:', category: 'sports', tags: ['goal', 'futbol'], sortOrder: 23 },
  { char: '🏆', name: 'Trophy', shortcode: ':trophy:', category: 'sports', tags: ['champion', 'win'], sortOrder: 24 },
  { char: '🥇', name: 'Gold Medal', shortcode: ':first_place_medal:', category: 'sports', tags: ['winner', 'first'], sortOrder: 25 },
  { char: '📈', name: 'Chart Increasing', shortcode: ':chart_with_upwards_trend:', category: 'stats', tags: ['up', 'growth'], sortOrder: 26 },
  { char: '📉', name: 'Chart Decreasing', shortcode: ':chart_with_downwards_trend:', category: 'stats', tags: ['down', 'loss'], sortOrder: 27 },
  { char: '🎯', name: 'Direct Hit', shortcode: ':dart:', category: 'stats', tags: ['target', 'accurate'], sortOrder: 28 },
  { char: '⏳', name: 'Hourglass', shortcode: ':hourglass_flowing_sand:', category: 'utility', tags: ['waiting', 'pending'], sortOrder: 29 },
  { char: '🕒', name: 'Clock Three O Clock', shortcode: ':clock3:', category: 'utility', tags: ['time', 'deadline'], sortOrder: 30 },
  { char: '💬', name: 'Speech Balloon', shortcode: ':speech_balloon:', category: 'utility', tags: ['chat', 'message'], sortOrder: 31 },
  { char: '📌', name: 'Pushpin', shortcode: ':pushpin:', category: 'utility', tags: ['pin', 'important'], sortOrder: 32 },
]

function normalizeTags(input: unknown, fallback: string): string[] {
  const fromApi = Array.isArray(input) ? input.filter((t): t is string => typeof t === 'string') : []
  const normalized = new Set<string>([fallback.toLowerCase(), ...fromApi.map((t) => t.toLowerCase())])
  return Array.from(normalized).slice(0, 12)
}

function mapKlipyGif(raw: KlipyGif, category: string): NormalizedGif | null {
  const modern = raw.file
  const hd = modern?.hd
  const md = modern?.md
  const sm = modern?.sm
  const xs = modern?.xs

  const url =
    hd?.gif?.url ??
    md?.gif?.url ??
    sm?.gif?.url ??
    xs?.gif?.url ??
    hd?.webp?.url ??
    md?.webp?.url ??
    sm?.webp?.url ??
    xs?.webp?.url ??
    sm?.jpg?.url ??
    xs?.jpg?.url ??
    raw.files?.gif?.url ??
    raw.files?.webp?.url ??
    ''

  if (!url) return null

  const id = String(raw.id ?? '').trim()
  if (!id) return null

  const previewUrl =
    sm?.webp?.url ??
    sm?.gif?.url ??
    xs?.webp?.url ??
    xs?.gif?.url ??
    sm?.jpg?.url ??
    xs?.jpg?.url ??
    raw.files?.gif_small?.url ??
    raw.files?.webp?.url ??
    url

  const width =
    hd?.gif?.width ??
    md?.gif?.width ??
    sm?.gif?.width ??
    xs?.gif?.width ??
    hd?.webp?.width ??
    md?.webp?.width ??
    sm?.webp?.width ??
    xs?.webp?.width ??
    raw.files?.gif?.width ??
    0

  const height =
    hd?.gif?.height ??
    md?.gif?.height ??
    sm?.gif?.height ??
    xs?.gif?.height ??
    hd?.webp?.height ??
    md?.webp?.height ??
    sm?.webp?.height ??
    xs?.webp?.height ??
    raw.files?.gif?.height ??
    0

  return {
    giphyId: id,
    title: raw.title?.trim() || `${category} GIF`,
    url,
    previewUrl,
    width: Number(width) || 0,
    height: Number(height) || 0,
    tags: normalizeTags(raw.tags, category),
    category,
  }
}

async function fetchKlipyPage(query: string, perPage: number, page: number): Promise<KlipyGif[]> {
  if (!KLIPY_API_KEY) return []
  const url = `https://api.klipy.com/api/v1/${KLIPY_API_KEY}/gifs/search?q=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&rating=g`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return []
  const json = (await res.json()) as { data?: { data?: KlipyGif[] } }
  return Array.isArray(json?.data?.data) ? json.data.data : []
}

export type ChatCatalogSyncOptions = {
  queries?: string[]
  perPage?: number
  pages?: number
}

export async function syncChatGifsFromKlipy(options: ChatCatalogSyncOptions = {}) {
  const queries = (options.queries && options.queries.length
    ? options.queries
    : ['touchdown', 'celebration', 'facepalm', 'laughing', 'hype', 'game winner']
  )
    .map((q) => q.trim().toLowerCase())
    .filter(Boolean)

  const perPage = Math.max(1, Math.min(50, Number(options.perPage || 24)))
  const pages = Math.max(1, Math.min(5, Number(options.pages || 1)))

  if (!KLIPY_API_KEY) {
    return {
      ok: false,
      reason: 'missing_klipy_key',
      fetched: 0,
      inserted: 0,
      updated: 0,
      queries,
    }
  }

  let fetched = 0
  let inserted = 0
  let updated = 0

  for (const query of queries) {
    const category = query.replace(/\s+/g, '-').slice(0, 40)
    for (let page = 1; page <= pages; page += 1) {
      const raw = await fetchKlipyPage(query, perPage, page)
      if (!raw.length) break
      fetched += raw.length

      for (const item of raw) {
        const mapped = mapKlipyGif(item, category)
        if (!mapped) continue

        const existing = await prisma.chatGif.findUnique({ where: { giphyId: mapped.giphyId } })
        await prisma.chatGif.upsert({
          where: { giphyId: mapped.giphyId },
          create: mapped,
          update: {
            title: mapped.title,
            url: mapped.url,
            previewUrl: mapped.previewUrl,
            tags: mapped.tags,
            category: mapped.category,
            width: mapped.width,
            height: mapped.height,
          },
        })

        if (existing) updated += 1
        else inserted += 1
      }
    }
  }

  return {
    ok: true,
    fetched,
    inserted,
    updated,
    queries,
    perPage,
    pages,
  }
}

export async function seedDefaultChatEmojis() {
  let inserted = 0
  let updated = 0

  for (const row of DEFAULT_EMOJIS) {
    const existing = await prisma.chatEmoji.findUnique({ where: { char: row.char } })
    await prisma.chatEmoji.upsert({
      where: { char: row.char },
      create: row,
      update: {
        name: row.name,
        shortcode: row.shortcode,
        category: row.category,
        tags: row.tags,
        sortOrder: row.sortOrder,
      },
    })

    if (existing) updated += 1
    else inserted += 1
  }

  return {
    ok: true,
    inserted,
    updated,
    total: DEFAULT_EMOJIS.length,
  }
}