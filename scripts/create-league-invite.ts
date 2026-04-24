/**
 * Dev helper: create a league invite link by hand when the UI doesn't expose one.
 *
 * USAGE:
 *   npx tsx scripts/create-league-invite.ts --league=<leagueId> --user=<commissionerAppUserId>
 *
 * Options:
 *   --max-uses=N   (default 1)
 *   --expires-days=N (default 7)
 */

import { PrismaClient } from '@prisma/client'
import { generateInviteToken } from '@/lib/invite-engine/tokenGenerator'

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {}
  for (const raw of argv.slice(2)) {
    if (!raw.startsWith('--')) continue
    const [k, v] = raw.slice(2).split('=')
    args[k] = v ?? true
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv)
  const leagueId = typeof args.league === 'string' ? args.league : ''
  const userId = typeof args.user === 'string' ? args.user : ''
  const maxUses = Number(args['max-uses'] ?? 1)
  const expiresDays = Number(args['expires-days'] ?? 7)
  if (!leagueId || !userId) {
    console.error('Usage: npx tsx scripts/create-league-invite.ts --league=<id> --user=<appUserId>')
    process.exit(2)
  }

  const prisma = new PrismaClient()
  try {
    const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { id: true, name: true } })
    if (!league) {
      console.error(`League ${leagueId} not found`)
      process.exit(2)
    }

    // Must match the app's token format — normalizeToken() uppercases on
    // lookup, and generateInviteToken() uses a uppercase-safe alphabet that
    // round-trips through that normalization cleanly.
    const token = generateInviteToken(12)
    const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000)

    const link = await prisma.inviteLink.create({
      data: {
        type: 'league',
        token,
        createdByUserId: userId,
        targetId: leagueId,
        expiresAt,
        maxUses: Number.isFinite(maxUses) && maxUses > 0 ? Math.floor(maxUses) : 0,
        status: 'active',
        metadata: { source: 'dev-script' },
      },
      select: { id: true, token: true, expiresAt: true, maxUses: true },
    })

    // Prefer APP_URL for local testing; fall back to NEXTAUTH_URL (which often
    // points at the production hostname in monorepo dev setups).
    // This row is an InviteLink (new unified invite system). Its consumer is
    // /invite/accept?code=<token> → POST /api/invite/accept → InviteEngine.
    // That's where the Slice 7.1 eviction hook lives. The legacy /join/<token>
    // page reads a DIFFERENT table (LeagueInvite) and WILL NOT see this row.
    const base = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    console.log(JSON.stringify({
      leagueId,
      leagueName: league.name,
      inviteLinkId: link.id,
      token: link.token,
      maxUses: link.maxUses,
      expiresAt: link.expiresAt?.toISOString(),
      acceptUrl: `${base}/invite/accept?code=${link.token}`,
      acceptUrlLocalhost: `http://localhost:3000/invite/accept?code=${link.token}`,
      note: 'Use acceptUrlLocalhost in your browser. Do NOT use /join/<token> — that is a different legacy system.',
    }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
