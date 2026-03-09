import { NextResponse } from 'next/server'
import { getPlatformServiceMap } from '@/lib/platform/service-map'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    map: getPlatformServiceMap(),
  })
}
