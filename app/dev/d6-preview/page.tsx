/**
 * D.6 — dev-only preview route. Mounts the new layout components with synthetic
 * data so the visible structural change can be screenshot-verified without
 * walking through auth + a real draft session.
 *
 * Production-safe: returns 404 outside development. Not linked from the app.
 */

import { notFound } from 'next/navigation'
import { isD6PreviewRouteEnabled } from '@/lib/dev/d6PreviewRoute'
import { D6PreviewClient } from './D6PreviewClient'

export const dynamic = 'force-dynamic'

export default function D6PreviewPage() {
  if (!isD6PreviewRouteEnabled()) notFound()
  return <D6PreviewClient />
}
