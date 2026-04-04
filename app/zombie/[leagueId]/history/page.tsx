import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export default async function ZombieHistoryPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params
  const z = await prisma.zombieLeague.findUnique({
    where: { leagueId },
    include: {
      weeklyResolutions: { orderBy: { week: 'desc' }, take: 18 },
    },
  })
  if (!z) {
    return <p className="text-[13px] text-red-400">Zombie league not found.</p>
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-white">Season history</h1>
      <ul className="space-y-3">
        {z.weeklyResolutions.map((w) => (
          <li
            key={w.id}
            className="rounded-xl border border-[var(--zombie-border)] bg-[var(--zombie-panel)] p-4 text-[13px]"
          >
            <p className="font-semibold text-white">Week {w.week}</p>
            <p className="text-[var(--zombie-text-mid)]">
              Infections: {w.infectionCount} · Status: {w.status}
            </p>
            <Link href={`/zombie/${leagueId}/matchups`} className="mt-2 inline-block text-[12px] text-sky-400 underline">
              View matchups
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
