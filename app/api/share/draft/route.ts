import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDraftGrades } from '@/lib/rankings-engine/draft-grades'
import type {
  DraftShareVariant,
  DraftShareCardPayload,
  DraftGradeCardPayload,
  DraftRankingsCardPayload,
  DraftWinnerCardPayload,
  DraftGradeRow,
} from '@/lib/draft-sharing/types'

export const dynamic = 'force-dynamic'

const DRAFT_SHARE_TYPES: DraftShareVariant[] = ['draft_grade', 'draft_rankings', 'draft_winner']

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const leagueId = String(body.leagueId ?? '').trim()
  const season = String(body.season ?? '').trim()
  const variant = DRAFT_SHARE_TYPES.includes(body.variant) ? body.variant : 'draft_rankings'
  const rosterId = body.rosterId != null ? String(body.rosterId) : null

  if (!leagueId || !season) {
    return NextResponse.json({ error: 'Missing leagueId or season' }, { status: 400 })
  }

  const [gradesRows, league] = await Promise.all([
    getDraftGrades({ leagueId, season }),
    prisma.league.findUnique({
      where: { id: leagueId },
      select: { name: true },
    }),
  ])

  const leagueName = league?.name?.trim() || `League ${leagueId}`
  const grades: DraftGradeRow[] = (gradesRows as any[]).map((r: any) => ({
    rosterId: String(r.rosterId),
    name: (r as any).name ?? undefined,
    grade: String(r.grade),
    score: Number(r.score ?? 0),
  }))

  if (grades.length === 0) {
    return NextResponse.json(
      { error: 'No draft grades for this league/season. Run draft grades first.' },
      { status: 400 }
    )
  }

  const sorted = [...grades].sort((a, b) => b.score - a.score)
  const winner = sorted[0]
  const getInsight = (grade: string, rank: number) =>
    `Post-draft grade: ${grade}. Ranked #${rank} of ${sorted.length} in ${leagueName}.`

  let payload: DraftShareCardPayload
  let title: string
  let summary: string

  if (variant === 'draft_grade' && rosterId) {
    const row = sorted.find((r) => r.rosterId === rosterId) ?? sorted[0]
    const rank = sorted.findIndex((r) => r.rosterId === row.rosterId) + 1
    payload = {
      variant: 'draft_grade',
      leagueId,
      leagueName,
      season,
      teamName: row.name ?? `Roster ${row.rosterId}`,
      rosterId: row.rosterId,
      grade: row.grade,
      score: row.score,
      insight: getInsight(row.grade, rank),
      rank,
    } as DraftGradeCardPayload
    title = `Draft Grade: ${(payload as DraftGradeCardPayload).teamName} — ${row.grade}`
    summary = (payload as DraftGradeCardPayload).insight
  } else if (variant === 'draft_winner') {
    payload = {
      variant: 'draft_winner',
      leagueId,
      leagueName,
      season,
      winnerName: winner.name ?? `Roster ${winner.rosterId}`,
      winnerRosterId: winner.rosterId,
      grade: winner.grade,
      score: winner.score,
      insight: `Top draft in ${leagueName} with a ${winner.grade} (${winner.score}).`,
      blurb: sorted[1] ? `Runner-up: ${sorted[1].name ?? `Roster ${sorted[1].rosterId}`} — ${sorted[1].grade}` : undefined,
    } as DraftWinnerCardPayload
    title = `Winner of the Draft: ${(payload as DraftWinnerCardPayload).winnerName}`
    summary = (payload as DraftWinnerCardPayload).insight
  } else {
    payload = {
      variant: 'draft_rankings',
      leagueId,
      leagueName,
      season,
      grades: sorted,
    } as DraftRankingsCardPayload
    title = `${leagueName} — Draft Rankings`
    summary = `${sorted.length} teams · Post-draft grades`
  }

  const moment = await prisma.shareableMoment.create({
    data: {
      userId: session.user.id,
      sport: 'NFL',
      shareType: variant,
      title,
      summary,
      metadata: {
        leagueId,
        leagueName,
        season,
        variant,
        payload,
      } as object,
    },
  })

  const base =
    process.env.NEXTAUTH_URL ??
    (req.headers.get('x-forwarded-host') ? `https://${req.headers.get('x-forwarded-host')}` : '')
  const shareUrl = base ? `${base.replace(/\/$/, '')}/share/${moment.id}` : ''

  return NextResponse.json({
    shareId: moment.id,
    shareUrl,
    payload,
    title: moment.title,
    summary: moment.summary,
  })
}
