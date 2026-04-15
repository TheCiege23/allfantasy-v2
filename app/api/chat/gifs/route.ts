import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const KLIPY_API_KEY = process.env.VITE_KLIPY_API_KEY?.trim() || process.env.KLIPY_API_KEY?.trim() || ''

/** Giphy fallback if Klipy key is not configured. */
const GIPHY_FALLBACK = 'dc6zaTOxFJmzC'

type KlipyGif = {
  id: string
  title?: string
  files?: {
    gif?: { url?: string; width?: number; height?: number }
    gif_small?: { url?: string }
    webp?: { url?: string }
    mp4?: { url?: string }
  }
}

function mapKlipyItem(g: KlipyGif) {
  const url = g.files?.gif?.url ?? g.files?.webp?.url ?? ''
  const previewUrl = g.files?.gif_small?.url ?? g.files?.webp?.url ?? url
  const w = g.files?.gif?.width ?? 0
  const h = g.files?.gif?.height ?? 0
  return {
    id: String(g.id),
    giphyId: String(g.id),
    url,
    previewUrl,
    title: g.title?.trim() || 'GIF',
    width: w,
    height: h,
  }
}

type GiphyApiGif = {
  id: string
  title?: string
  images?: {
    original?: { url?: string; width?: string; height?: string }
    fixed_width_small?: { url?: string }
    downsized_small?: { url?: string }
  }
}

function mapGiphyItem(g: GiphyApiGif) {
  const url = g.images?.original?.url ?? ''
  const previewUrl =
    g.images?.fixed_width_small?.url ?? g.images?.downsized_small?.url ?? url
  const w = Number(g.images?.original?.width) || 0
  const h = Number(g.images?.original?.height) || 0
  return { id: g.id, giphyId: g.id, url, previewUrl, title: g.title?.trim() || 'GIF', width: w, height: h }
}

type DbGifRow = {
  id: string
  giphyId: string
  title: string
  url: string
  previewUrl: string
  tags: string[]
  category: string
  width: number
  height: number
}

function mapDbRow(r: DbGifRow) {
  return { id: r.id, giphyId: r.giphyId, url: r.url, previewUrl: r.previewUrl, title: r.title, width: r.width, height: r.height }
}

async function fetchKlipyGifs(q: string, limit: number, page: number) {
  const url = `https://api.klipy.com/api/v1/${KLIPY_API_KEY}/gifs/search?q=${encodeURIComponent(q)}&per_page=${limit}&page=${page}&rating=g`
  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) return []
  const json = (await res.json()) as { result?: boolean; data?: { data?: KlipyGif[] } }
  return (json.data?.data ?? []).map(mapKlipyItem)
}

async function fetchGiphyGifs(q: string, limit: number, offset: number) {
  const apiKey = process.env.GIPHY_API_KEY || GIPHY_FALLBACK
  if (!apiKey) return []
  const giphyUrl = new URL('https://api.giphy.com/v1/gifs/search')
  giphyUrl.searchParams.set('api_key', apiKey)
  giphyUrl.searchParams.set('q', q)
  giphyUrl.searchParams.set('limit', String(limit))
  giphyUrl.searchParams.set('rating', 'g')
  giphyUrl.searchParams.set('offset', String(offset))
  const res = await fetch(giphyUrl.toString(), { next: { revalidate: 60 } })
  if (!res.ok) return []
  const data = (await res.json()) as { data?: GiphyApiGif[] }
  return (data.data ?? []).map(mapGiphyItem)
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams?.get('q')?.trim() ?? ''
  const limit = Math.min(Number(req.nextUrl.searchParams?.get('limit') || '24'), 48)
  const offset = Math.max(Number(req.nextUrl.searchParams?.get('offset') || '0'), 0)
  const categoryFilter = req.nextUrl.searchParams?.get('category')?.trim()

  try {
    if (!q) {
      const where = categoryFilter ? { category: categoryFilter } : {}
      const rows = await prisma.chatGif.findMany({
        where,
        orderBy: [{ category: 'asc' }, { title: 'asc' }],
        take: limit,
        skip: offset,
      })
      const total = await prisma.chatGif.count({ where })
      return NextResponse.json({ gifs: rows.map(mapDbRow), total })
    }

    const term = `%${q}%`
    const dbRows = categoryFilter
      ? await prisma.$queryRaw<DbGifRow[]>`
          SELECT id, "giphyId", title, url, "previewUrl", tags, category, width, height
          FROM "chat_gifs"
          WHERE category = ${categoryFilter}
            AND (title ILIKE ${term}
              OR category ILIKE ${term}
              OR array_to_string(tags, ' ') ILIKE ${term})
          ORDER BY category ASC, title ASC
          OFFSET ${offset}
          LIMIT ${limit}
        `
      : await prisma.$queryRaw<DbGifRow[]>`
          SELECT id, "giphyId", title, url, "previewUrl", tags, category, width, height
          FROM "chat_gifs"
          WHERE (title ILIKE ${term}
             OR category ILIKE ${term}
             OR array_to_string(tags, ' ') ILIKE ${term})
          ORDER BY category ASC, title ASC
          OFFSET ${offset}
          LIMIT ${limit}
        `

    const seen = new Set(dbRows.map((r) => r.giphyId))
    let remote: ReturnType<typeof mapKlipyItem>[] = []

    // Klipy is primary; fall back to Giphy if Klipy key is missing
    if (dbRows.length < 12) {
      const page = Math.floor(offset / limit) + 1
      remote = KLIPY_API_KEY
        ? await fetchKlipyGifs(q, Math.min(24, limit), page)
        : await fetchGiphyGifs(q, Math.min(24, limit), offset)
      remote = remote.filter((x) => !seen.has(x.giphyId))
    }

    const combined = [...dbRows.map(mapDbRow)]
    for (const r of remote) {
      if (combined.length >= limit) break
      if (!seen.has(r.giphyId)) {
        seen.add(r.giphyId)
        combined.push(r)
      }
    }

    return NextResponse.json({ gifs: combined, total: combined.length })
  } catch (e) {
    console.error('[api/chat/gifs]', e)
    return NextResponse.json({ gifs: [], total: 0, error: 'Failed to load GIFs' }, { status: 500 })
  }
}
