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
    <div className="min-h-screen text-white bg-[#02061a] bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(20,40,100,0.55),rgba(1,4,20,0.96))]">
      <header className="px-4 pt-4 pb-2">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Link
            href="/app"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/20 text-lg text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Back"
          >
            ←
          </Link>
          <h1 className="text-lg font-semibold tracking-tight">Create league</h1>
          <span className="h-9 w-9" />
        </div>
      </header>
      <CreateLeagueView userId={userId} initialTemplateId={initialTemplateId} />
    </div>
  )
}
