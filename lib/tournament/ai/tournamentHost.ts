import { prisma } from '@/lib/prisma'
import { openaiChatText } from '@/lib/openai-client'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

async function assertAfCommissionerSub(userId: string): Promise<void> {
  const profile = await prisma.userProfile.findFirst({
    where: { userId },
    select: { afCommissionerSub: true },
  })
  if (!profile?.afCommissionerSub) {
    throw new Error('AF Commissioner Subscription required for AI tournament host features.')
  }
}

export async function generateRoundSummary(
  userId: string,
  tournamentId: string,
  roundNumber: number,
): Promise<string> {
  await assertAfCommissionerSub(userId)
  const shell = await prisma.tournamentShell.findUnique({
    where: { id: tournamentId },
    include: { rounds: true },
  })
  if (!shell) throw new Error('Tournament not found')
  const round = shell.rounds.find((r) => r.roundNumber === roundNumber)
  const sport = normalizeToSupportedSport(shell.sport)

  const res = await openaiChatText({
    messages: [
      {
        role: 'system',
        content:
          'You are Chimmy, AllFantasy’s calm analyst. Write factual, premium sports journalism. No invented statistics.',
      },
      {
        role: 'user',
        content: `Write a round summary for an AllFantasy tournament.
Round label: ${round?.roundLabel ?? `Round ${roundNumber}`}. Sport: ${sport}.
Summarize standings themes, who likely advanced or is on the bubble if known from context below.
Tournament: ${shell.name}. Status: ${shell.status}.
Tone: premium, dramatic but factual. Length: 3-4 short paragraphs.`,
      },
    ],
    temperature: 0.65,
    maxTokens: 900,
  })
  if (!res.ok) throw new Error(res.details || 'AI unavailable')
  const text = res.text.trim()
  await prisma.tournamentShellAnnouncement.create({
    data: {
      tournamentId,
      roundNumber,
      type: 'round_summary',
      title: `${round?.roundLabel ?? `Round ${roundNumber}`} summary`,
      content: text,
      targetAudience: 'all',
      isPosted: true,
      postedAt: new Date(),
    },
  })
  return text
}

export async function generateConferenceTheme(
  userId: string,
  sport: string,
  existingThemes: string[],
): Promise<{ name: string; theme: string; color: string }> {
  await assertAfCommissionerSub(userId)
  const s = normalizeToSupportedSport(sport)
  const res = await openaiChatText({
    messages: [
      {
        role: 'user',
        content: `Suggest one conference identity for a ${s} fantasy tournament. Avoid themes: ${existingThemes.join(', ')}.
Respond in exactly this plain text format (no JSON):
NAME: ...
THEME: ...
COLOR: #RRGGBB`,
      },
    ],
    temperature: 0.8,
    maxTokens: 200,
  })
  if (!res.ok) throw new Error(res.details || 'AI unavailable')
  const lines = res.text.split('\n').map((l) => l.trim())
  const name = lines.find((l) => l.startsWith('NAME:'))?.replace(/^NAME:\s*/i, '') ?? 'Conference One'
  const theme = lines.find((l) => l.startsWith('THEME:'))?.replace(/^THEME:\s*/i, '') ?? 'custom'
  const color =
    lines.find((l) => l.startsWith('COLOR:'))?.replace(/^COLOR:\s*/i, '') ?? '#38BDF8'
  return { name, theme, color }
}

export async function generateAdvancementMessage(
  userId: string,
  args: {
    participantName: string
    fromLeague: string
    toLeague: string
    record: string
    roundNumber: number
    draftDate?: string
  },
): Promise<string> {
  await assertAfCommissionerSub(userId)
  const res = await openaiChatText({
    messages: [
      {
        role: 'user',
        content: `Write a short personal advancement note for ${args.participantName}.
They advanced from ${args.fromLeague} with record ${args.record} to ${args.toLeague} for round ${args.roundNumber}.
Draft begins ${args.draftDate ?? 'soon'}. Congratulate briefly; one paragraph; no hype spam.`,
      },
    ],
    temperature: 0.6,
    maxTokens: 220,
  })
  if (!res.ok) throw new Error(res.details || 'AI unavailable')
  return res.text.trim()
}

export async function generateEliminationMessage(
  userId: string,
  args: { participantName: string; league: string; record: string },
): Promise<string> {
  await assertAfCommissionerSub(userId)
  const res = await openaiChatText({
    messages: [
      {
        role: 'user',
        content: `Write a respectful elimination note for ${args.participantName}.
They competed in ${args.league} with record ${args.record}. Thank them; one short paragraph.`,
      },
    ],
    temperature: 0.55,
    maxTokens: 180,
  })
  if (!res.ok) throw new Error(res.details || 'AI unavailable')
  return res.text.trim()
}
