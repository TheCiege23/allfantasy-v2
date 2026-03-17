/**
 * OneBrainNarrativeComposer — one-brain merge: deterministic facts + DeepSeek (verify/significance) + Grok (frame) + OpenAI (final story).
 * Output is fact-grounded; no theatrical fiction.
 */

import { deepseekChat } from "@/lib/deepseek-client"
import { openaiChatJson, parseJsonContentFromChatCompletion } from "@/lib/openai-client"
import { grokEnrich } from "@/lib/ai-external/grok"
import type { NarrativeContextPackage, StoryOutput } from "./types"

function contextToBlob(ctx: NarrativeContextPackage): string {
  return JSON.stringify(
    {
      leagueId: ctx.leagueId,
      sport: ctx.sportLabel,
      season: ctx.season,
      storyType: ctx.storyType,
      dramaEvents: ctx.dramaEvents.slice(0, 10).map((e) => ({
        headline: e.headline,
        summary: e.summary,
        dramaType: e.dramaType,
        dramaScore: e.dramaScore,
        relatedManagerIds: e.relatedManagerIds,
      })),
      rivalries: ctx.rivalries.slice(0, 8),
      graphSummary: ctx.graphSummary,
      rankingsSnapshot: ctx.rankingsSnapshot,
      legacyHint: ctx.legacyHint,
      simulationHint: ctx.simulationHint,
    },
    null,
    2
  )
}

/**
 * Run one-brain merge and return structured StoryOutput. Uses only provided context; does not invent.
 */
export async function composeOneBrainStory(
  context: NarrativeContextPackage
): Promise<StoryOutput | null> {
  const blob = contextToBlob(context)

  const [deepSeekResult, grokResult] = await Promise.allSettled([
    deepseekChat({
      prompt: `Using ONLY the following league data (facts only), identify in 2-3 sentences what is most significant for a ${context.storyType} story. Do not invent any names, scores, or events.\n\n${blob}`,
      systemPrompt:
        "You are a fantasy sports analyst. Output only the significance summary, no preamble. Be factual. Reference only entities and numbers from the data.",
      temperature: 0.3,
      maxTokens: 250,
    }).then((r) => (r.error ? "" : r.content?.trim() ?? "")),
    grokEnrich({
      kind: "trade_narrative",
      context: { scope: "league_story", storyType: context.storyType, leagueId: context.leagueId },
      payload: { graphSummary: context.graphSummary, dramaCount: context.dramaEvents.length, rivalryCount: context.rivalries.length },
    }).then((r) => {
      if (!r.ok || !r.narrative?.length) return ""
      return Array.isArray(r.narrative) ? r.narrative.join(" ") : String(r.narrative)
    }).catch(() => ""),
  ])

  const significance = deepSeekResult.status === "fulfilled" ? deepSeekResult.value : ""
  const narrativeFraming = grokResult.status === "fulfilled" ? grokResult.value : ""

  const systemPrompt = `You are the AllFantasy League Story Creator. You produce fact-grounded narrative stories from structured league data.

RULES:
- Use ONLY the provided context. Do not invent players, matchups, standings, trades, rivalries, or scores.
- Every claim must be traceable to the context (drama events, rivalries, graph summary).
- If data is thin, keep the story short and say so.
- Output valid JSON only, with these exact keys: headline, whatHappened, whyItMatters, whoItAffects, keyEvidence (array of strings), nextStorylineToWatch.
- Optional: shortVersion (under 280 chars), socialVersion (under 280 chars), longVersion (2-4 sentences).
- keyEvidence must list only facts from the context (e.g. "Drama event: [headline]", "Rivalry: [nodeA] vs [nodeB]").
- Tone: engaging but factual, not theatrical.`

  const userPrompt = `Context (facts only):
${blob}
${significance ? `\nSignificance (from analysis): ${significance}` : ""}
${narrativeFraming ? `\nNarrative framing: ${narrativeFraming}` : ""}

Generate a ${context.storyType} league story. Return JSON only.`

  const res = await openaiChatJson({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.5,
    maxTokens: 1200,
  })

  if (!res.ok) return null
  const json = parseJsonContentFromChatCompletion(res.json)
  if (!json || typeof json !== "object") return null

  const headline = typeof json.headline === "string" ? json.headline.trim() : "League Story"
  const whatHappened = typeof json.whatHappened === "string" ? json.whatHappened.trim() : ""
  const whyItMatters = typeof json.whyItMatters === "string" ? json.whyItMatters.trim() : ""
  const whoItAffects = typeof json.whoItAffects === "string" ? json.whoItAffects.trim() : ""
  const keyEvidence = Array.isArray(json.keyEvidence)
    ? (json.keyEvidence as string[]).filter((e): e is string => typeof e === "string").slice(0, 10)
    : []
  const nextStorylineToWatch = typeof json.nextStorylineToWatch === "string" ? json.nextStorylineToWatch.trim() : ""

  const style =
    json.style === "announcer" || json.style === "recap" || json.style === "neutral"
      ? json.style
      : undefined

  return {
    headline: headline.slice(0, 200),
    whatHappened: whatHappened.slice(0, 1500),
    whyItMatters: whyItMatters.slice(0, 800),
    whoItAffects: whoItAffects.slice(0, 500),
    keyEvidence,
    nextStorylineToWatch: nextStorylineToWatch.slice(0, 300),
    shortVersion: typeof json.shortVersion === "string" ? json.shortVersion.slice(0, 280) : undefined,
    socialVersion: typeof json.socialVersion === "string" ? json.socialVersion.slice(0, 280) : undefined,
    longVersion: typeof json.longVersion === "string" ? json.longVersion.slice(0, 800) : undefined,
    style,
  }
}
