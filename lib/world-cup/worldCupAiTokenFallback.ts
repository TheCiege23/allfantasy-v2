import "server-only"
import { NextResponse } from "next/server"
import {
  TokenInsufficientBalanceError,
  TokenSpendRuleNotFoundError,
  TokenSpendService,
  type TokenLedgerEntryView,
  type TokenSpendPreview,
} from "@/lib/tokens/TokenSpendService"
import type { TokenSpendRuleCode } from "@/lib/tokens/constants"

export const WORLD_CUP_AI_TOKEN_RULES = {
  matchup: "world_cup_ai_matchup_analysis",
  bracketExplanation: "world_cup_ai_bracket_explanation",
  commissionerReport: "world_cup_ai_commissioner_report",
  chimmyCoaching: "world_cup_ai_chimmy_coaching",
  edgeReport: "world_cup_ai_edge_report",
} as const satisfies Record<string, TokenSpendRuleCode>

export type WorldCupAiTokenAccess =
  | {
      ok: true
      mode: "subscription"
      tokenPreview: null
      commitTokenSpend: null
    }
  | {
      ok: true
      mode: "tokens"
      tokenPreview: TokenSpendPreview
      commitTokenSpend: () => Promise<TokenLedgerEntryView>
    }
  | {
      ok: false
      response: NextResponse
    }

function tokenConfirmationResponse(preview: TokenSpendPreview, upgradePath: string) {
  return NextResponse.json(
    {
      error: "Token spend confirmation required.",
      code: "token_confirmation_required",
      message: `Use ${preview.tokenCost} token${preview.tokenCost === 1 ? "" : "s"} for this World Cup AI action.`,
      upgrade: true,
      upgradePath,
      preview,
    },
    { status: 409 }
  )
}

function insufficientTokenResponse(preview: TokenSpendPreview, upgradePath: string) {
  return NextResponse.json(
    {
      error: "Insufficient token balance",
      code: "insufficient_token_balance",
      message: `Need ${preview.tokenCost} token${preview.tokenCost === 1 ? "" : "s"} for this one-time World Cup AI action.`,
      upgrade: true,
      upgradePath,
      preview,
    },
    { status: 402 }
  )
}

function missingRuleResponse(ruleCode: string, upgradePath: string) {
  return NextResponse.json(
    {
      error: "Token fallback is temporarily unavailable for this World Cup AI action.",
      code: "token_spend_rule_missing",
      ruleCode,
      upgrade: true,
      upgradePath,
    },
    { status: 500 }
  )
}

export async function prepareWorldCupAiTokenFallback(input: {
  userId: string
  userEmail?: string | null
  entitled: boolean
  ruleCode: TokenSpendRuleCode
  confirmTokenSpend?: boolean
  sourceType: string
  sourceId: string
  idempotencyKey: string
  description: string
  metadata?: Record<string, unknown>
  upgradePath: string
}): Promise<WorldCupAiTokenAccess> {
  if (input.entitled) {
    return { ok: true, mode: "subscription", tokenPreview: null, commitTokenSpend: null }
  }

  const tokenSpendService = new TokenSpendService()
  let preview: TokenSpendPreview
  try {
    preview = await tokenSpendService.previewSpend(
      input.userId,
      input.ruleCode,
      input.userEmail ?? null
    )
  } catch (error) {
    if (error instanceof TokenSpendRuleNotFoundError) {
      return { ok: false, response: missingRuleResponse(input.ruleCode, input.upgradePath) }
    }
    throw error
  }

  if (!preview.canSpend) {
    return { ok: false, response: insufficientTokenResponse(preview, input.upgradePath) }
  }

  if (!input.confirmTokenSpend) {
    return { ok: false, response: tokenConfirmationResponse(preview, input.upgradePath) }
  }

  return {
    ok: true,
    mode: "tokens",
    tokenPreview: preview,
    commitTokenSpend: async () => {
      try {
        return await tokenSpendService.spendTokensForRule({
          userId: input.userId,
          ruleCode: input.ruleCode,
          confirmed: true,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          idempotencyKey: input.idempotencyKey,
          description: input.description,
          metadata: input.metadata ?? null,
          userEmail: input.userEmail ?? null,
        })
      } catch (error) {
        if (error instanceof TokenSpendRuleNotFoundError) {
          throw new Error(`World Cup token rule missing: ${input.ruleCode}`)
        }
        if (error instanceof TokenInsufficientBalanceError) {
          throw new Error("Insufficient token balance")
        }
        throw error
      }
    },
  }
}
