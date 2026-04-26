import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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

    return NextResponse.json({ gifs: dbRows.map(mapDbRow), total: dbRows.length })
  } catch (e) {
    console.error('[api/chat/gifs]', e)
    return NextResponse.json({ gifs: [], total: 0, error: 'Failed to load GIFs' }, { status: 500 })
  }
}
