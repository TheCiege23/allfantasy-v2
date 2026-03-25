import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import MockDraftLobbyPage from '@/components/mock-draft/MockDraftLobbyPage'
import { LandingToolVisitTracker } from '@/components/landing/LandingToolVisitTracker'
import EngagementEventTracker from '@/components/engagement/EngagementEventTracker'
import { isMockDraftsEnabled } from '@/lib/feature-toggle'
import { buildMetadata, getSEOPageConfig } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata = buildMetadata(
  getSEOPageConfig('mock-draft') ?? {
    title: 'Mock Drafts – AllFantasy',
    description: 'Create, run, and share unlimited AllFantasy mock drafts with AI-powered insights.',
    canonical: 'https://allfantasy.ai/mock-draft',
  }
)

export default async function MockDraftPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login?callbackUrl=/mock-draft')
  const enabled = await isMockDraftsEnabled()

  if (!enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="rounded-xl border p-6 max-w-md text-center" style={{ borderColor: "var(--border)" }}>
          <h1 className="text-lg font-semibold mb-2" style={{ color: "var(--text)" }}>
            Mock drafts are temporarily disabled
          </h1>
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
            This tool has been turned off by the platform configuration.
          </p>
          <a href="/dashboard" className="text-sm font-medium" style={{ color: "var(--accent)" }}>
            Back to dashboard
          </a>
        </div>
      </div>
    )
  }

  const [leagues, savedDrafts] = await Promise.all([
    prisma.league.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        platform: true,
        leagueSize: true,
        isDynasty: true,
        scoring: true,
        sport: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
    prisma.mockDraft.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        shareId: true,
        rounds: true,
        results: true,
        metadata: true,
        createdAt: true,
      },
    }),
  ])

  const leagueOptions = leagues.map((l) => ({
    id: l.id,
    name: l.name || 'Unnamed League',
    platform: l.platform,
    leagueSize: l.leagueSize ?? 12,
    isDynasty: l.isDynasty,
    scoring: l.scoring,
    sport: l.sport ?? undefined,
  }))

  const saved = savedDrafts.map((d) => ({
    id: d.id,
    shareId: d.shareId ?? null,
    rounds: d.rounds,
    createdAt: d.createdAt.toISOString(),
    metadata: (d.metadata as any) || null,
    results: Array.isArray(d.results) ? (d.results as any[]) : [],
  }))

  return (
    <>
      <LandingToolVisitTracker path="/mock-draft" toolName="Draft Helper" />
      <EngagementEventTracker
        eventType="mock_draft"
        oncePerDayKey="tool_mock_draft"
        meta={{ product: "legacy" }}
      />
      <div className="min-h-screen bg-[#05060b] py-10 pb-20">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            AllFantasy Mock Drafts
          </h1>
          <p className="mt-2 text-sm text-white/60 sm:text-base">
            Spin up unlimited mocks, experiment with draft spots, and save/share your favorite builds.
          </p>
        </div>
        <MockDraftLobbyPage leagues={leagueOptions} savedDrafts={saved} />
      </div>
    </div>
    </>
  )
}

