import { NextResponse } from 'next/server'
import { hasDatabaseUrl } from '@/lib/env/database-url'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-LY788DCM6K'

  let database: { configured: boolean; connected: boolean; error?: string } = {
    configured: hasDatabaseUrl(process.env),
    connected: false,
  }

  // Only load Prisma when a URL exists — otherwise `@/lib/prisma` throws at import time.
  if (database.configured) {
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.$queryRaw`SELECT 1`
      database = { ...database, connected: true }
    } catch (e) {
      database = {
        ...database,
        connected: false,
        error: e instanceof Error ? e.message.slice(0, 200) : 'query_failed',
      }
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    database,
    analytics: {
      gaMeasurementId,
      hasMetaPixelId: Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID),
      env: process.env.NODE_ENV || 'development',
    },
  })
}
