import { NextRequest, NextResponse } from "next/server"
import { generateAndSaveDraft } from "@/lib/automated-blog"
import { normalizeToSupportedSport } from "@/lib/sport-scope"
import { BLOG_CATEGORIES } from "@/lib/automated-blog/types"

/** POST /api/blog/generate-and-save — generate and save as draft in one step. Body: sport, category, topicHint?. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const sport = body?.sport ?? ""
    const category = body?.category ?? ""
    if (!sport || !category || !BLOG_CATEGORIES.includes(category as any)) {
      return NextResponse.json(
        { error: "Missing or invalid sport/category" },
        { status: 400 }
      )
    }
    const result = await generateAndSaveDraft({
      sport: normalizeToSupportedSport(sport),
      category: category as any,
      topicHint: body.topicHint,
      contentType: category as any,
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Failed" }, { status: 400 })
    }
    return NextResponse.json({ articleId: result.articleId, slug: result.slug })
  } catch (e) {
    console.error("[blog/generate-and-save]", e)
    return NextResponse.json({ error: "Failed to generate and save" }, { status: 500 })
  }
}
