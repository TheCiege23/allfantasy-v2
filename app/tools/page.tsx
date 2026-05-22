import { redirect } from 'next/navigation'

/**
 * Phase 1 fix: /tools previously 404'd because no page.tsx existed in
 * `app/tools/`. Canonical tools index lives at /tools-hub.
 */
export const dynamic = 'force-dynamic'

export default function ToolsIndexRedirect(): never {
  redirect('/tools-hub')
}
