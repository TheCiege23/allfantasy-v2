import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { MockDraftReplayTimeline } from '@/components/mock-draft/MockDraftReplayTimeline'

export const dynamic = 'force-dynamic'

export default async function MockDraftReplayPage({
  params,
}: {
  params: { draftId: string }
}) {
  const session = (await getServerSession(authOptions as any)) as
    | { user?: { id?: string } }
    | null
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/mock-draft')
  }
  const { draftId } = params

  return (
    <div className="min-h-screen bg-[#05060b] py-8 pb-16">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
          <Link
            href={`/mock-draft?draftId=${encodeURIComponent(draftId)}`}
            className="rounded-lg border border-white/20 px-2 py-1 hover:bg-white/10"
          >
            Back to mock room
          </Link>
          <span className="text-white/45">Replay ID: {draftId}</span>
        </div>
        <MockDraftReplayTimeline draftId={draftId} />
      </div>
    </div>
  )
}

