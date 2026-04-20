import type { HandlerContext, HandlerResult } from '@/lib/specialty-automation/types'
import type { SpecialtyConceptKey } from '@/lib/specialty-automation/types'
import { runGuillotineHandler } from '@/lib/specialty-automation/handlers/guillotineHandler'
import { runSurvivorHandler } from '@/lib/specialty-automation/handlers/survivorHandler'
import { runBigBrotherHandler } from '@/lib/specialty-automation/handlers/bigBrotherHandler'
import { runStandardHandler } from '@/lib/specialty-automation/handlers/defaultHandler'
import { runTournamentHandler } from '@/lib/specialty-automation/handlers/tournamentHandler'
import { runZombieHandler } from '@/lib/specialty-automation/handlers/zombieHandler'
import { runDevyHandler } from '@/lib/specialty-automation/handlers/devyHandler'
import { runC2CHandler } from '@/lib/specialty-automation/handlers/c2cHandler'
import { runPirateVampireHandler } from '@/lib/specialty-automation/handlers/pirateVampireHandler'
import { runRoyalHandler } from '@/lib/specialty-automation/handlers/royalHandler'
import { runKingOfTheHillHandler } from '@/lib/specialty-automation/handlers/kingOfTheHillHandler'

export async function dispatchConceptHandler(
  conceptKey: SpecialtyConceptKey,
  ctx: HandlerContext,
): Promise<HandlerResult> {
  switch (conceptKey) {
    case 'guillotine':
      return runGuillotineHandler(ctx)
    case 'survivor':
      return runSurvivorHandler(ctx)
    case 'big_brother':
      return runBigBrotherHandler(ctx)
    case 'tournament':
      return runTournamentHandler(ctx)
    case 'zombie':
      return runZombieHandler(ctx)
    case 'devy':
      return runDevyHandler(ctx)
    case 'c2c':
      return runC2CHandler(ctx)
    case 'pirate_vampire':
      return runPirateVampireHandler(ctx)
    case 'royal':
      return runRoyalHandler(ctx)
    case 'king_of_the_hill':
      return runKingOfTheHillHandler(ctx)
    case 'standard':
    default:
      return runStandardHandler(ctx)
  }
}
