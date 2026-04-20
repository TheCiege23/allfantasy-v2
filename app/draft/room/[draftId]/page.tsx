import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { resolveDraftRouteContext } from '@/lib/draft/resolve-draft-context'
import { DraftBoard } from '@/components/draft/DraftBoard'

export const dynamic = 'force-dynamic'

/**
 * Canonical “draft room” URL — same live client as `/draft/[draftId]/snake`.
 * Use for deep links from league home / notifications.
 */
export default async function DraftRoomPage({
  params,
}: {
  params: Promise<{ draftId: string }>
}) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  const { draftId } = await params

  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/draft/room/${draftId}`)}`)
  }

  const context = await resolveDraftRouteContext(draftId, userId)
  if (!context) redirect('/dashboard')

  return (
    <div className="min-h-screen">
      {context.kind === 'mock' ? (
        <div className="mx-auto max-w-6xl p-4">
          <DraftBoard kind="mock" draftId={context.draftId} canManage />
        </div>
      ) : (
        <DraftBoard
          kind="live"
          draftId={context.draftId}
          leagueId={context.leagueId}
          leagueName={context.leagueName}
          sport={context.sport}
          isDynasty={context.isDynasty}
          isCommissioner={context.isCommissioner}
          formatType={context.formatType}
        />
      )}
    </div>
  )
}
