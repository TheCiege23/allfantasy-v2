import { notFound } from 'next/navigation'
import { MockDraftRoomHarnessClient } from './MockDraftRoomHarnessClient'

export default async function E2EMockDraftRoomPage(props: {
  searchParams?: Promise<{ mode?: string }> | { mode?: string }
}) {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const sp = props.searchParams ?? {}
  const resolved =
    typeof (sp as Promise<{ mode?: string }>).then === 'function'
      ? await (sp as Promise<{ mode?: string }>)
      : (sp as { mode?: string })
  const mode = String(resolved.mode ?? '').toLowerCase() === 'active' ? 'active' : 'setup'

  return <MockDraftRoomHarnessClient mode={mode} />
}
