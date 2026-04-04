import { prisma } from '@/lib/prisma'
import { generateZombieRulesDocumentHtml } from '@/lib/zombie/rulesDocGenerator'

export default async function ZombieRulesPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params
  const z = await prisma.zombieLeague.findUnique({ where: { leagueId }, select: { sport: true } })
  const html = await generateZombieRulesDocumentHtml(leagueId, z?.sport ?? 'NFL')

  return (
    <div className="mx-auto max-w-3xl px-1 py-4">
      <h1 className="sr-only">Zombie rules</h1>
      <div
        className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-[var(--zombie-text-mid)] prose-li:text-[var(--zombie-text-mid)]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <p className="mt-6 text-[11px] text-[var(--zombie-text-dim)]">
        Last updated: {new Date().toISOString().slice(0, 10)} (regenerate from commissioner settings when wired).
      </p>
    </div>
  )
}
