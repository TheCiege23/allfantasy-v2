import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const category = req.nextUrl.searchParams.get('category')?.trim()

  try {
    const and: Array<Record<string, unknown>> = []
    if (q) {
      and.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' as const } },
          { shortcode: { contains: q, mode: 'insensitive' as const } },
        ],
      })
    }
    if (category) {
      and.push({ category })
    }

    const where = and.length ? { AND: and } : {}

    const rows = await prisma.chatEmoji.findMany({
      where,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    })

    const qLower = q.toLowerCase()
    const filtered = q
      ? rows.filter(
          (r) =>
            r.name.toLowerCase().includes(qLower) ||
            r.shortcode.toLowerCase().includes(qLower) ||
            r.tags.some((t) => t.toLowerCase().includes(qLower))
        )
      : rows

    const categories = Array.from(new Set(filtered.map((r) => r.category))).sort()

    if (!q && !category) {
      const grouped: Record<string, typeof filtered> = {}
      for (const r of filtered) {
        if (!grouped[r.category]) grouped[r.category] = []
        grouped[r.category].push(r)
      }
      return NextResponse.json({
        emojis: filtered.map((r) => ({
          id: r.id,
          char: r.char,
          name: r.name,
          shortcode: r.shortcode,
          category: r.category,
        })),
        categories,
        grouped,
      })
    }

    return NextResponse.json({
      emojis: filtered.map((r) => ({
        id: r.id,
        char: r.char,
        name: r.name,
        shortcode: r.shortcode,
        category: r.category,
      })),
      categories,
    })
  } catch (e) {
    console.error('[api/chat/emojis]', e)
    return NextResponse.json({ emojis: [], categories: [], error: 'Failed to load emojis' }, { status: 500 })
  }
}
