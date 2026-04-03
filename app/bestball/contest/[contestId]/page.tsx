import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function BestBallContestPage({ params }: { params: Promise<{ contestId: string }> }) {
  const { contestId } = await params
  const contest = await prisma.bestBallContest.findFirst({
    where: { id: contestId },
    include: {
      pods: { include: { entries: true } },
      entries: true,
    },
  })
  if (!contest) notFound()

  return (
    <div className="min-h-screen bg-[#040915] p-4 text-[#e6edf3]">
      <header className="mx-auto max-w-3xl border-b border-white/10 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-300/80">Best ball contest</p>
        <h1 className="mt-1 text-xl font-bold text-white">{contest.name}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-white/50">
          <span className="rounded-md bg-white/5 px-2 py-0.5">{contest.sport}</span>
          <span className="rounded-md bg-white/5 px-2 py-0.5">status: {contest.status}</span>
          <span className="rounded-md bg-white/5 px-2 py-0.5">pods: {contest.pods.length}</span>
        </div>
      </header>

      <section className="mx-auto mt-6 max-w-3xl space-y-4">
        <h2 className="text-sm font-semibold text-white">Entries</h2>
        <ul className="space-y-2">
          {contest.entries.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0a1228] px-3 py-2 text-[13px]"
            >
              <span>{e.entryName ?? e.id.slice(0, 8)}</span>
              <span className="text-white/50">{e.totalPoints.toFixed(1)} pts</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
