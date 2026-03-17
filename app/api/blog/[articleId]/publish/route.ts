import { NextRequest, NextResponse } from "next/server"
import { publishArticle } from "@/lib/automated-blog"

/** POST /api/blog/[articleId]/publish — publish now. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params
    const result = await publishArticle(articleId)
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Failed" }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[blog publish]", e)
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 })
  }
}
