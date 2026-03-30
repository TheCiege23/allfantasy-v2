export type TokenBalanceSnapshot = {
  balance: number
  updatedAt: string
}

export class TokenBalanceResolver {
  async resolveForUser(_userId: string): Promise<TokenBalanceSnapshot> {
    // Phase-1 bridge: stable route contract before persisted token account/ledger lands.
    return {
      balance: 0,
      updatedAt: new Date().toISOString(),
    }
  }
}
