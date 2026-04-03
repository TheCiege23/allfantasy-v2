import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** Dev fallback — Giphy public beta (rate-limited); prefer GIPHY_API_KEY in production. */
const GIPHY_FALLBACK = 'dc6zaTOxFJmzC'

type GiphyApiGif = {
  id: string
  title?: string
  images?: {
    original?: { url?: string; width?: string; height?: string }
    fixed_width_small?: { url?: string; width?: string; height?: string }
    downsized_small?: { url?: string }
  }
}

function mapGiphyItem(g: GiphyApiGif) {
  const url = g.images?.original?.url ?? ''
  const previewUrl =
    g.images?.fixed_width_small?.url ?? g.images?.downsized_small?.url ?? g.images?.original?.url ?? ''
  const w = Number(g.images?.original?.width) || 0
  const h = Number(g.images?.original?.height) || 0
  return {
    id: g.id,
    giphyId: g.id,
    url,
    previewUrl,
    title: g.title?.trim() || 'GIF',
    width: w,
    height: h,
  }
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
  return {
    id: r.id,
    giphyId: r.giphyId,
    url: r.url,
    previewUrl: r.previewUrl,
    title: r.title,
    width: r.width,
    height: r.height,
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || '24'), 48)
  const offset = Math.max(Number(req.nextUrl.searchParams.get('offset') || '0'), 0)

  const categoryFilter = req.nextUrl.searchParams.get('category')?.trim()

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
      return NextResponse.json({
        gifs: rows.map(mapDbRow),
        total,
      })
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
    let remote: ReturnType<typeof mapGiphyItem>[] = []

    const apiKey = process.env.GIPHY_API_KEY || GIPHY_FALLBACK
    if (dbRows.length < 12 && apiKey) {
      const giphyUrl = new URL('https://api.giphy.com/v1/gifs/search')
      giphyUrl.searchParams.set('api_key', apiKey)
      giphyUrl.searchParams.set('q', q)
      giphyUrl.searchParams.set('limit', String(Math.min(24, limit)))
      giphyUrl.searchParams.set('rating', 'g')
      giphyUrl.searchParams.set('offset', String(offset))

      const res = await fetch(giphyUrl.toString(), { next: { revalidate: 60 } })
      if (res.ok) {
        const data = (await res.json()) as { data?: GiphyApiGif[] }
        remote = (data.data ?? []).map(mapGiphyItem).filter((x) => !seen.has(x.giphyId))
      }
    }

    const combined = [...dbRows.map(mapDbRow)]
    for (const r of remote) {
      if (combined.length >= limit) break
      if (!seen.has(r.giphyId)) {
        seen.add(r.giphyId)
        combined.push({
          id: r.giphyId,
          giphyId: r.giphyId,
          url: r.url,
          previewUrl: r.previewUrl,
          title: r.title,
          width: r.width,
          height: r.height,
        })
      }
    }

    return NextResponse.json({
      gifs: combined,
      total: combined.length,
    })
  } catch (e) {
    console.error('[api/chat/gifs]', e)
    return NextResponse.json({ gifs: [], total: 0, error: 'Failed to load GIFs' }, { status: 500 })
  }
}
