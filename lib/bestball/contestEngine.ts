import { prisma } from '@/lib/prisma'
import { runBestBallOptimizer } from './optimizer'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/** Assign shuffled entries into pods of `contest.podSize`. */
export async function assignEntriesToPods(contestId: string): Promise<void> {
  const contest = await prisma.bestBallContest.findFirst({ where: { id: contestId } })
  if (!contest) throw new Error('Contest not found')

  const entries = await prisma.bestBallEntry.findMany({ where: { contestId } })
  const ordered = shuffle(entries)
  const size = Math.max(1, contest.podSize)
  let podNumber = 1
  for (let i = 0; i < ordered.length; i += size) {
    const slice = ordered.slice(i, i + size)
    const pod = await prisma.bestBallPod.create({
      data: {
        contestId,
        roundNumber: 1,
        podNumber,
        status: 'forming',
        advancers: [],
      },
    })
    for (const e of slice) {
      await prisma.bestBallEntry.update({
        where: { id: e.id },
        data: { podId: pod.id },
      })
    }
    podNumber++
  }
}

/** Advance top `advancersPerPod` from each pod by cumulative points. */
export async function advancePodWinners(contestId: string, roundNumber: number): Promise<void> {
  const contest = await prisma.bestBallContest.findFirst({ where: { id: contestId } })
  if (!contest) throw new Error('Contest not found')

  const pods = await prisma.bestBallPod.findMany({
    where: { contestId, roundNumber },
    include: { entries: true },
  })

  const cut = contest.advancersPerPod

  for (const pod of pods) {
    const sorted = [...pod.entries].sort((a, b) => b.totalPoints - a.totalPoints)
    const advance: typeof sorted = []
    for (let i = 0; i < sorted.length; i++) {
      const e = sorted[i]!
      if (advance.length < cut) {
        advance.push(e)
        continue
      }
      const last = advance[advance.length - 1]!
      if (e.totalPoints === last.totalPoints) advance.push(e)
      else break
    }
    const advanceIds = new Set(advance.map((e) => e.id))
    for (const e of pod.entries) {
      const did = advanceIds.has(e.id)
      await prisma.bestBallEntry.update({
        where: { id: e.id },
        data: {
          hasAdvanced: did,
          isEliminated: !did,
          currentRound: roundNumber + 1,
        },
      })
    }
    await prisma.bestBallPod.update({
      where: { id: pod.id },
      data: { advancers: advance.map((e) => e.id), status: 'complete' },
    })
  }
}

export async function finalizeContest(contestId: string): Promise<void> {
  await prisma.bestBallContest.update({
    where: { id: contestId },
    data: { status: 'complete' },
  })
}

export async function calculateContestScores(contestId: string, week: number): Promise<void> {
  const contest = await prisma.bestBallContest.findFirst({ where: { id: contestId } })
  if (!contest) throw new Error('Contest not found')

  const entries = await prisma.bestBallEntry.findMany({
    where: { contestId, isEliminated: false },
  })

  for (const e of entries) {
    await runBestBallOptimizer({
      entryId: e.id,
      leagueId: null,
      week,
      sport: contest.sport,
    })

    const row = await prisma.bestBallOptimizedLineup.findFirst({
      where: { contestId, entryId: e.id, week },
    })
    const pts = row?.totalPoints ?? 0
    const prev = (e.weeklyScores as { week: number; points: number }[] | null) ?? []
    const nextScores = [...prev.filter((x) => x.week !== week), { week, points: pts }]
    const totalPoints = contest.cumulativeScoring
      ? nextScores.reduce((s, x) => s + x.points, 0)
      : pts

    await prisma.bestBallEntry.update({
      where: { id: e.id },
      data: {
        totalPoints,
        weeklyScores: nextScores as object,
      },
    })
  }
}

export type WeeklyWinnerResult = { entryId: string; points: number; week: number }

export async function resolveWeeklyWinners(contestId: string, week: number): Promise<WeeklyWinnerResult[]> {
  await calculateContestScores(contestId, week)
  const entries = await prisma.bestBallEntry.findMany({ where: { contestId } })
  const withWeek = entries.map((e) => ({
    e,
    w: (e.weeklyScores as { week: number; points: number }[] | null)?.find((x) => x.week === week)?.points ?? 0,
  }))
  withWeek.sort((a, b) => b.w - a.w)
  const top = withWeek[0]?.w ?? 0
  return withWeek.filter((x) => x.w === top).map((x) => ({ entryId: x.e.id, points: x.w, week }))
}

export async function finalizeSitAndGo(podId: string): Promise<void> {
  const pod = await prisma.bestBallPod.findFirst({
    where: { id: podId },
    include: { entries: true },
  })
  if (!pod) throw new Error('Pod not found')
  const sorted = [...pod.entries].sort((a, b) => b.totalPoints - a.totalPoints)
  let rank = 1
  for (const e of sorted) {
    await prisma.bestBallEntry.update({
      where: { id: e.id },
      data: { podRank: rank, overallRank: rank },
    })
    rank++
  }
  await prisma.bestBallPod.update({
    where: { id: podId },
    data: { status: 'complete' },
  })
}
