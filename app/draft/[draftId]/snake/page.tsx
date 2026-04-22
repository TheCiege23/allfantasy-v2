import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { resolveDraftRouteContext } from '@/lib/draft/resolve-draft-context'
import { DraftBoard } from '@/components/draft/DraftBoard'

export const dynamic = 'force-dynamic'

export default async function SnakeDraftPage({
  params,
}: {
  params: Promise<{ draftId: string }>
}) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  const { draftId } = await params

  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/draft/${draftId}/snake`)}`)
  }

  const context = await resolveDraftRouteContext(draftId, userId)
  if (!context) redirect('/dashboard')

  return (
    <div
      className={
        context.kind === 'live' &&
        !context.isDynasty &&
        context.routeType === 'snake' &&
        String(context.draftType).toLowerCase() !== 'auction'
          ? 'min-h-screen bg-[radial-gradient(ellipse_100%_60%_at_50%_0%,rgba(34,211,238,0.08),transparent_50%)]'
          : 'min-h-screen'
      }
    >
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
          presentationVariant={
            !context.isDynasty &&
            context.routeType === 'snake' &&
            String(context.draftType).toLowerCase() !== 'auction'
              ? 'redraft_snake'
              : 'default'
          }
        />
      )}
    </div>
  )
}
