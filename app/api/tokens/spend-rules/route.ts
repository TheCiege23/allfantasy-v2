import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { TokenSpendService } from "@/lib/tokens/TokenSpendService"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)
    const category = url.searchParams.get("category")?.trim() || null
    const includeInactive = url.searchParams.get("includeInactive") === "true"

    const service = new TokenSpendService()
    const rules = await service.getSpendRules({
      activeOnly: !includeInactive,
      userId: session.user.id,
    })
    const filtered = category ? rules.filter((rule) => rule.category === category) : rules

    return NextResponse.json({
      rules: filtered,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[tokens/spend-rules GET]", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to load spend rules" }, { status: 500 })
  }
}
