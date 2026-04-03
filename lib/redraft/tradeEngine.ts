import { prisma } from '@/lib/prisma'

export async function processTrade(tradeId: string): Promise<void> {
  await prisma.redraftLeagueTrade.update({
    where: { id: tradeId },
    data: { status: 'pending', processedAt: null },
  })
}

export async function checkTradeVeto(
  tradeId: string,
  _leagueId: string,
): Promise<'approved' | 'vetoed' | 'pending'> {
  const t = await prisma.redraftLeagueTrade.findFirst({ where: { id: tradeId } })
  if (!t) return 'pending'
  if (t.vetoCount >= t.vetoThreshold) return 'vetoed'
  return 'pending'
}
