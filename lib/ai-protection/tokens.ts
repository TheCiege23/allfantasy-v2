/**
 * Token enforcement for AI: check balance before allowing a request.
 * When platform token balance is persisted, resolve from DB and deduct here.
 * Until then, all requests are allowed (no deduction).
 */

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
  _userId: string | null,
  _estimatedCost: number = 0
): Promise<TokenCheckResult> {
  // TODO: when GET /api/tokens/balance is backed by DB, fetch balance here
  // and return { allowed: balance >= estimatedCost, remaining: balance - estimatedCost }.
  return { allowed: true }
}

/**
 * Optional: deduct tokens after a successful AI call.
 * No-op until balance is persisted.
 */
export async function deductTokens(
  _userId: string | null,
  _cost: number
): Promise<{ ok: boolean }> {
  // TODO: persist deduction when token balance table exists
  return { ok: true }
}
