import { NextResponse } from "next/server"
import { searchGifs } from "@/lib/rich-message/GIFIntegrationResolver"
import {
  assertWorldCupChallengeMemberOrManager,
  requireWorldCupApiUser,
  worldCupChallengeParamsSchema,
} from "../../../_utils"

export const runtime = "nodejs"

function sanitizeGifQuery(value: string | null) {
  return (value ?? "")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 64)
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

export async function GET(
  request: Request,
  context: { params: { challengeId: string } }
) {
  const auth = await requireWorldCupApiUser(request)
  if (!auth.ok) return auth.response

  const params = worldCupChallengeParamsSchema.safeParse(context.params)
  if (!params.success) {
    return NextResponse.json({ error: "Invalid challenge id" }, { status: 400 })
  }

  const access = await assertWorldCupChallengeMemberOrManager(request, params.data.challengeId, auth.user)
  if (!access.ok) return access.response

  const url = new URL(request.url)
  const q = sanitizeGifQuery(url.searchParams.get("q"))
  if (!q) {
    return NextResponse.json({ gifs: [], total: 0 })
  }

  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 12), 1), 24)
  const results = await searchGifs(q, limit)
  const gifs = results.map((gif) => ({
    id: gif.id,
    title: "GIF",
    previewUrl: gif.previewUrl ?? gif.url,
    gifUrl: gif.url,
    width: safeNumber((gif as { width?: unknown }).width),
    height: safeNumber((gif as { height?: unknown }).height),
    provider: gif.provider,
  }))

  return NextResponse.json({ gifs, total: gifs.length })
}
