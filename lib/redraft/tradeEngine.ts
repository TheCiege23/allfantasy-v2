import { prisma } from '@/lib/prisma'
import { applyRedraftTradeCapTransfers, validateRedraftTradeCap } from '@/lib/idp/capEngine'

/** Executes IDP cap transfers when the league has `IDPCapConfig`; then updates trade row. */
export async function processTrade(tradeId: string): Promise<void> {
  const t = await prisma.redraftLeagueTrade.findUnique({ where: { id: tradeId } })
  if (!t) throw new Error('Trade not found')

  const cap = await validateRedraftTradeCap(
    t.leagueId,
    t.proposerRosterId,
    t.receiverRosterId,
    t.proposerOffers,
    t.receiverOffers,
  )
  if (!cap.ok) {
    const err = new Error(cap.message)
    ;(err as { statusCode?: number }).statusCode = 409
    throw err
  }

  await applyRedraftTradeCapTransfers(
    t.leagueId,
    t.proposerRosterId,
    t.receiverRosterId,
    t.proposerOffers,
    t.receiverOffers,
  )

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
