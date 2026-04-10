import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  TokenSpendService,
  TokenSpendRuleNotFoundError,
} from "@/lib/tokens/TokenSpendService"
import { isDevAdminUserId, buildDevAdminTokenSpendPreview } from "@/lib/dev-admin/access"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)
    const ruleCode = String(url.searchParams?.get("ruleCode") ?? "").trim()
    if (!ruleCode) {
      return NextResponse.json({ error: "Missing ruleCode" }, { status: 400 })
    }

    if (isDevAdminUserId(session.user.id)) {
      const preview = buildDevAdminTokenSpendPreview(ruleCode)
      return NextResponse.json({
        preview,
        message: `This action costs ${preview.tokenCost} token${preview.tokenCost === 1 ? "" : "s"}.`,
      })
    }

    const service = new TokenSpendService()
    const preview = await service.previewSpend(session.user.id, ruleCode)
    return NextResponse.json({
      preview,
      message: preview.canSpend
        ? `This action costs ${preview.tokenCost} token${preview.tokenCost === 1 ? "" : "s"}.`
        : `You need ${preview.tokenCost} tokens for this action.`,
    })
  } catch (error) {
    if (error instanceof TokenSpendRuleNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("[tokens/spend/preview GET]", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to preview token spend" }, { status: 500 })
  }
}

