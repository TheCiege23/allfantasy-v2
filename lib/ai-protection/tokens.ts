/**
 * Token enforcement for AI: check balance before allowing a request.
 * Uses persisted token balance from UserTokenBalance.
 */

import { TokenSpendService } from "@/lib/tokens/TokenSpendService"

export type TokenCheckResult = {
  allowed: boolean
  remaining?: number
  /** When not allowed, suggested retry message. */
  message?: string
}

/**
 * Check if the user has enough balance for estimated cost.
 * estimatedCost: optional tokens to deduct for this request.
 * Returns { allowed: true } when balance is not yet implemented.
 */
export async function checkTokenBalance(
  userId: string | null,
  estimatedCost: number = 0
): Promise<TokenCheckResult> {
  if (!userId) {
    return {
      allowed: false,
      remaining: 0,
      message: "Sign in to use token-metered AI features.",
    }
  }

  const required = Math.max(0, Math.trunc(estimatedCost))
  if (required <= 0) {
    return { allowed: true }
  }

  const service = new TokenSpendService()
  const snapshot = await service.getBalance(userId)
  const remaining = Math.max(0, snapshot.balance - required)
  if (snapshot.balance < required) {
    return {
      allowed: false,
      remaining,
      message: `Need ${required} tokens. Current balance: ${snapshot.balance}.`,
    }
  }

  return { allowed: true, remaining }
}

/**
 * Optional: deduct tokens after a successful AI call.
 * No-op until balance is persisted.
 */
export async function deductTokens(
  _userId: string | null,
  _cost: number
): Promise<{ ok: boolean }> {
  // Route-level token deductions must use TokenSpendService.spendTokensForRule()
  // with explicit user confirmation and a centralized spend rule.
  return { ok: true }
}
