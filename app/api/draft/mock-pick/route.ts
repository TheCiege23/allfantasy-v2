import { POST as cpuPick } from '@/app/api/draft/mock/cpu-pick/route'

export const dynamic = 'force-dynamic'

/** POST { draftId, ... } — `draftId` is mock room id; forwards to cpu-pick with `sessionId`. */
export async function POST(req: Request) {
  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const draftId = typeof raw?.draftId === 'string' ? raw.draftId.trim() : ''
  if (!draftId) {
    return new Response(JSON.stringify({ error: 'draftId required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }
  const sessionId = `mock:${draftId}`
  const next = { ...raw, sessionId }
  return cpuPick(
    new Request(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(next),
    }),
  )
}
