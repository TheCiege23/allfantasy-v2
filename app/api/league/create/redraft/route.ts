/**
 * @deprecated Prefer POST /api/leagues/redraft/create — behavior is identical.
 */
import { postRedraftCreate } from '@/lib/redraft-creation/post-redraft-create'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  return postRedraftCreate(req)
}
