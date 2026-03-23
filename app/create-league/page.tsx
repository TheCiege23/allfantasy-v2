import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CreateLeagueView } from '@/components/league-creation'

export const dynamic = 'force-dynamic'

export default async function CreateLeaguePage(props: { searchParams?: Promise<{ template?: string; e2eAuth?: string }> | { template?: string; e2eAuth?: string } }) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const sp = props.searchParams ?? {}
  const resolved = typeof (sp as Promise<{ template?: string; e2eAuth?: string }>).then === 'function'
    ? await (sp as Promise<{ template?: string; e2eAuth?: string }>)
    : (sp as { template?: string; e2eAuth?: string })
  const allowE2EBypass =
    process.env.NODE_ENV !== 'production' &&
    resolved?.e2eAuth === '1'
  const userId = session?.user?.id ?? (allowE2EBypass ? 'e2e-user' : undefined)
  if (!userId) redirect('/login?callbackUrl=/create-league')
  const initialTemplateId = resolved?.template

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 bg-black/30 px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Link
            href="/app"
            className="text-sm text-white/70 hover:text-white"
          >
            ← Back
          </Link>
          <h1 className="text-base font-semibold">Create league</h1>
          <span className="w-10" />
        </div>
      </header>
      <CreateLeagueView userId={userId} initialTemplateId={initialTemplateId} />
    </div>
  )
}
