import { TokenSpendService } from "@/lib/tokens/TokenSpendService"

export type TokenBalanceSnapshot = {
  balance: number
  lifetimePurchased: number
  lifetimeSpent: number
  lifetimeRefunded: number
  updatedAt: string
}

export class TokenBalanceResolver {
  async resolveForUser(userId: string, userEmail?: string | null): Promise<TokenBalanceSnapshot> {
    const service = new TokenSpendService()
    return service.getBalance(userId, userEmail)
  }
}
