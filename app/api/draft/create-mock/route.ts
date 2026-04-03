import { NextResponse } from 'next/server'
import { POST as createRoom } from '@/app/api/draft/room/create/route'

export const dynamic = 'force-dynamic'

/** POST { leagueId, sport?, numTeams?, ... } — creates mock room + returns `draftId` (= room id) for `/draft/mock/[draftId]`. */
export async function POST(req: Request) {
  const res = await createRoom(req)
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (res.ok && typeof data.roomId === 'string') {
    return NextResponse.json({ ...data, draftId: data.roomId }, { status: res.status })
  }
  return NextResponse.json(data, { status: res.status })
}
