/**
 * AI explanation of the League Intelligence Graph.
 * DeepSeek: metrics/interpretation. Grok: momentum/storyline. OpenAI: readable summary.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildLeagueRelationshipProfile } from "@/lib/league-intelligence-graph";
import { deepseekChat } from "@/lib/deepseek-client";
import { openaiChatText } from "@/lib/openai-client";
import { grokEnrich } from "@/lib/ai-external/grok";

export const dynamic = "force-dynamic";

type InsightType = "summary" | "rivalry" | "manager" | "timeline";

function profileToSummaryLines(profile: {
  strongestRivalries: unknown[];
  tradeClusters: unknown[];
  influenceLeaders: unknown[];
  centralManagers: unknown[];
  isolatedManagers: unknown[];
  dynastyPowerTransitions: unknown[];
}): string {
  const lines: string[] = [];
  if (profile.strongestRivalries?.length) {
    lines.push(`Strong rivalries: ${profile.strongestRivalries.length} pairs.`);
  }
  if (profile.tradeClusters?.length) {
    lines.push(`Trade clusters: ${profile.tradeClusters.length} (alliance-like trading groups).`);
  }
  if (profile.influenceLeaders?.length) {
    lines.push(`Influence leaders: ${profile.influenceLeaders.length} managers with high centrality or impact.`);
  }
  if (profile.centralManagers?.length) {
    lines.push(`Central managers: ${profile.centralManagers.length} highly connected.`);
  }
  if (profile.isolatedManagers?.length) {
    lines.push(`Isolated managers: ${profile.isolatedManagers.length} with few graph connections.`);
  }
  if (profile.dynastyPowerTransitions?.length) {
    lines.push(`Power transitions: ${profile.dynastyPowerTransitions.length} dynasty-era shifts.`);
  }
  return lines.join(" ");
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params;
    if (!leagueId) {
      return NextResponse.json({ error: "Missing leagueId" }, { status: 400 });
    }
    let body: { type?: InsightType; season?: number | null; focusEntityId?: string } = {};
    try {
      body = await req.json().catch(() => ({}));
    } catch {}
    const type = body.type ?? "summary";
    const season = body.season ?? null;

    const profile = await buildLeagueRelationshipProfile({
      leagueId,
      season,
      limits: { rivalries: 15, clusters: 8, influence: 12, central: 20, transitions: 15, elimination: 15 },
    });

    const summaryForAI = profileToSummaryLines(profile);
    const topRival = profile.strongestRivalries[0];
    const topInfluence = profile.influenceLeaders[0];
    const contextBlob = JSON.stringify({
      leagueId,
      season: profile.season,
      summary: summaryForAI,
      topRival: topRival
        ? { nodeA: topRival.nodeA, nodeB: topRival.nodeB, intensityScore: topRival.intensityScore }
        : null,
      topInfluence: topInfluence
        ? { entityId: topInfluence.entityId, compositeScore: topInfluence.compositeScore }
        : null,
      transitionCount: profile.dynastyPowerTransitions.length,
      focusEntityId: body.focusEntityId ?? null,
    });

    let metricsInterpretation = "";
    let momentumStoryline = "";
    let readableSummary = "";

    const [deepSeekResult, grokResult, openaiResult] = await Promise.all([
      deepseekChat({
        prompt: `League graph metrics. ${summaryForAI}. In 1-2 sentences, interpret what these metrics say about this league's relationships and power structure. Be factual and concise.`,
        systemPrompt: "You are a fantasy sports graph analyst. Output only the interpretation, no preamble.",
        temperature: 0.3,
        maxTokens: 200,
      }).then((r) => (r.error ? "" : r.content?.trim() ?? "")),
      grokEnrich({
        kind: "trade_narrative",
        context: { scope: "league_graph", type, leagueId },
        payload: { graphSummary: summaryForAI, focus: body.focusEntityId ?? null },
      }).then((r) => {
        if (!r.ok || !r.narrative?.length) return "";
        return Array.isArray(r.narrative) ? r.narrative.join(" ") : String(r.narrative);
      }),
      openaiChatText({
        messages: [
          {
            role: "system",
            content:
              "You are a fantasy league analyst. In 2-4 short sentences, explain what this league's relationship graph shows: key rivalries, who trades with whom, who is central or isolated, and how power has shifted over time if applicable. Be clear and engaging. No bullet lists.",
          },
          {
            role: "user",
            content: `League Intelligence Graph data:\n${contextBlob}\n\nWrite a brief readable summary for the league owner.`,
          },
        ],
        temperature: 0.5,
        maxTokens: 400,
      }).then((r) => (r.ok ? r.text.trim() : "")),
    ]);

    metricsInterpretation = deepSeekResult;
    momentumStoryline = grokResult;
    readableSummary = openaiResult;

    return NextResponse.json({
      leagueId,
      season: profile.season,
      type,
      metricsInterpretation: metricsInterpretation || null,
      momentumStoryline: momentumStoryline || null,
      readableSummary: readableSummary || null,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[graph-insight POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Graph insight failed" },
      { status: 500 }
    );
  }
}
