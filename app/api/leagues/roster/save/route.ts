import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const leagueId = body?.leagueId as string | null

  if (!leagueId) {
    return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })
  }

  // For now this is a no-op persistence endpoint. It validates the request and
  // returns success so the client autosave UX can behave like a modern fantasy
  // app while deeper lineup sync is wired in.

  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Placeholder save endpoint for homepage/app roster auto-save.
// In a future pass this should validate league membership and persist to a real model.

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { leagueId, roster } = body || {}

  // For now, accept the payload and pretend it is saved.
  return NextResponse.json({ status: 'ok' })
}

