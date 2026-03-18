/**
 * GET /api/ai/validation — AI system validation: areas (draft, chat, trades, waivers, war room)
 * and provider availability. Session required. Use for "ensure AI works everywhere" check.
 */

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { checkProviderAvailability } from "@/lib/ai-orchestration"

export const dynamic = "force-dynamic"

const AREAS = [
  {
    id: "draft",
    description: "Draft AI: pick suggestions, mock draft simulation, in-league orphan pick",
    endpoints: [
      "POST /api/mock-draft/ai-pick",
      "POST /api/mock-draft/simulate",
      "POST /api/mock-draft/trade-action",
      "POST /api/leagues/[leagueId]/draft/ai-pick",
      "POST /api/draft/recommend",
    ],
  },
  {
    id: "chat",
    description: "Chat (Chimmy): AI assistant, tools, multi-provider",
    endpoints: [
      "POST /api/chat/chimmy",
      "POST /api/ai/chimmy",
      "POST /api/ai/chat",
    ],
  },
  {
    id: "trades",
    description: "Trades: trade analyzer, AI grades, orphan trade decision",
    endpoints: [
      "POST /api/trade-evaluator",
      "POST /api/dynasty-trade-analyzer",
      "POST /api/legacy/trade/analyze",
      "POST /api/ai/trade-eval",
      "POST /api/leagues/[leagueId]/trade/ai-decision",
    ],
  },
  {
    id: "waivers",
    description: "Waivers: Waiver AI priorities, FAAB, trends",
    endpoints: [
      "POST /api/waiver-ai",
      "POST /api/legacy/waiver/analyze",
      "POST /api/ai/waiver",
    ],
  },
  {
    id: "war_room",
    description: "War room: same as draft (mock-draft ai-pick, needs, predict-board)",
    endpoints: [
      "POST /api/mock-draft/ai-pick",
      "POST /api/mock-draft/needs",
      "POST /api/mock-draft/predict-board",
    ],
  },
] as const

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const providers = checkProviderAvailability()
  const atLeastOne = Object.values(providers).some(Boolean)

  return NextResponse.json({
    ok: atLeastOne,
    areas: AREAS.map((a) => ({
      id: a.id,
      description: a.description,
      endpoints: a.endpoints,
    })),
    providers,
    message: atLeastOne
      ? "At least one AI provider is available; areas may have additional provider requirements."
      : "No AI providers configured; set OPENAI_API_KEY, DEEPSEEK_API_KEY, or XAI_API_KEY.",
  })
}
