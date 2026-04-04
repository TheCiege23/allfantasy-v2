import { NextResponse } from 'next/server'
import { listPlayerValueDocMeta } from '@/lib/player-values/playerValuesLoader'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const docs = listPlayerValueDocMeta()
    return NextResponse.json(docs)
  } catch {
    return NextResponse.json([])
  }
}
