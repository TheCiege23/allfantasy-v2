import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  TokenInsufficientBalanceError,
  TokenSpendConfirmationRequiredError,
  TokenSpendRuleNotFoundError,
  TokenSpendService,
} from "@/lib/tokens/TokenSpendService"

type SpendRequestBody = {
  ruleCode?: string
  confirmed?: boolean
  sourceType?: string
  sourceId?: string
  idempotencyKey?: string
  description?: string
  metadata?: Record<string, unknown>
}

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as SpendRequestBody
    const ruleCode = String(body.ruleCode ?? "").trim()
    if (!ruleCode) {
      return NextResponse.json({ error: "Missing ruleCode" }, { status: 400 })
    }

    const service = new TokenSpendService()
    const ledger = await service.spendTokensForRule({
      userId: session.user.id,
      ruleCode,
      confirmed: Boolean(body.confirmed),
      sourceType: String(body.sourceType ?? "manual_token_spend"),
      sourceId: body.sourceId ? String(body.sourceId) : null,
      idempotencyKey: body.idempotencyKey ? String(body.idempotencyKey) : null,
      description: body.description ? String(body.description) : null,
      metadata: body.metadata ?? null,
    })

    return NextResponse.json({
      ok: true,
      ledger,
      currentBalance: ledger.balanceAfter,
    })
  } catch (error) {
    if (error instanceof TokenSpendRuleNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof TokenSpendConfirmationRequiredError) {
      return NextResponse.json(
        {
          error: "Token spend requires explicit confirmation.",
          code: "token_confirmation_required",
          ruleCode: error.ruleCode,
          requiredTokens: error.tokenCost,
        },
        { status: 409 }
      )
    }
    if (error instanceof TokenInsufficientBalanceError) {
      return NextResponse.json(
        {
          error: "Insufficient token balance",
          code: "insufficient_token_balance",
          requiredTokens: error.requiredTokens,
          currentBalance: error.currentBalance,
        },
        { status: 402 }
      )
    }
    console.error("[tokens/spend POST]", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to spend tokens" }, { status: 500 })
  }
}
