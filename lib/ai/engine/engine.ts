/**
 * AllFantasy Universal AI Engine — Orchestration Pipeline
 *
 * This file never changes per-sport. Sport-specific logic lives entirely
 * in plugin files under lib/ai/engine/plugins/.
 *
 * Pipeline:
 *   1. Resolve plugin from registry
 *   2. fetchContext         (DB — pure data)
 *   3. fetchProviderData    (sports API — live/cached)
 *   4. computeInsights      (deterministic math — NO AI)
 *   5. buildGroundingPacket (assemble LLM payload)
 *   6. [engine calls AI]    (narrative/tone only)
 *   7. validateResponse     (sanitize + compliance)
 *   8. Return AIEngineOutput
 */
import "server-only"
import { routeTextCall } from "@/lib/ai/providerRouter"
import { getPlugin } from "./registry"
import type { AIEngineInput, AIEngineOutput, DataFreshnessTier, DataSourceMeta } from "./types"

// ─── Universal response sanitizer ─────────────────────────────────────────────

const FORBIDDEN_PATTERNS: RegExp[] = [
  /\bdfs\b/gi,
  /\bbetting\b/gi,
  /\bwager(?:ing|s|ed)?\b/gi,
  /\bsportsbook(?:s)?\b/gi,
  /\b(?:money|betting\s+)?odds\b/gi,
  /\bspread\b/gi,
  /\bover\/under\b/gi,
  /\bprop\s+bet/gi,
]

function universalSanitize(text: string): string {
  return FORBIDDEN_PATTERNS.reduce(
    (t, pattern) => t.replace(pattern, "prediction"),
    text,
  ).replace(/\s{2,}/g, " ").trim()
}

// ─── Data source meta builder ──────────────────────────────────────────────────

function buildDataSourceMeta(
  freshness: DataFreshnessTier,
  fetchedAt: Date | null,
): DataSourceMeta {
  if (freshness === "live") {
    const timeLabel = fetchedAt
      ? new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: "America/New_York",
        }).format(fetchedAt) + " ET"
      : "now"
    return {
      tier: "live",
      label: `Live data from ${timeLabel}`,
      poolDataLabel: "Pool data from AllFantasy",
      ageMinutes: 0,
    }
  }
  if (freshness === "cached" && fetchedAt) {
    const ageMs = Date.now() - fetchedAt.getTime()
    const ageMinutes = Math.round(ageMs / 60_000)
    const label =
      ageMinutes < 2
        ? "Cached data updated just now"
        : `Cached data last updated ${ageMinutes} min ago`
    return { tier: "cached", label, poolDataLabel: "Pool data from AllFantasy", ageMinutes }
  }
  if (freshness === "schedule_only") {
    return {
      tier: "schedule_only",
      label: "Schedule data only — live scores not loaded yet",
      poolDataLabel: "Pool data from AllFantasy",
      ageMinutes: null,
    }
  }
  if (freshness === "pool_only") {
    return {
      tier: "pool_only",
      label: null,
      poolDataLabel: "Pool data from AllFantasy",
      ageMinutes: null,
    }
  }
  return {
    tier: "none",
    label: "No sports data available",
    poolDataLabel: "Pool data from AllFantasy",
    ageMinutes: null,
  }
}

// ─── Universal grounding enforcement header ────────────────────────────────────

function universalGroundingHeader(): string {
  return [
    "GROUNDING CONTRACT: You are an AllFantasy AI assistant.",
    "The user message contains a GROUNDING PACKET (JSON). That packet is your ONLY source of facts about this pool, sport, schedule, scores, standings, injuries, odds, teams, and players.",
    "STRICT RULE: Only answer using facts present in the GROUNDING PACKET. If a fact is not in the packet, explicitly say what data is missing and suggest where the user can check.",
    "MATH RULE: Never compute scores, percentages, ranks, or point totals yourself. All numbers are pre-computed in the packet — cite them, never recalculate.",
    "DISCLOSURE RULE: If the packet includes a dataSource label, you MUST cite it at the start of any answer about scores, standings, or live events.",
    "FORBIDDEN: Betting advice, odds, spreads, DFS, prop bets, private user emails, invite codes, or any fact not in the packet.",
    "VOICE: Confident, specific, warm. Short bullets or 1–2 tight paragraphs.",
  ].join(" ")
}

// ─── Main engine ───────────────────────────────────────────────────────────────

/**
 * Universal AllFantasy AI pipeline entry point.
 *
 * Call from any API route — never call sport-specific AI logic directly.
 * All AI logic should flow through this function so grounding, sanitization,
 * and data disclosure enforcement are applied consistently across all sports.
 *
 * @example
 * ```ts
 * const result = await runAIEngine({
 *   sport: "world_cup",
 *   feature: "pool_chat",
 *   userQuestion: req.question,
 *   userId: auth.user.id,
 *   contextId: challengeId,
 *   entitlements: { plan: "commissioner" },
 *   userRole: "commissioner",
 * })
 * return NextResponse.json({ text: result.aiResponse, source: result.dataSource })
 * ```
 */
export async function runAIEngine(input: AIEngineInput): Promise<AIEngineOutput> {
  const start = Date.now()

  // ── 1. Resolve plugin ────────────────────────────────────────────────────────
  const plugin = getPlugin(input.sport)
  if (!plugin) {
    throw new Error(
      `[AIEngine] No plugin registered for sport "${input.sport}". ` +
        `Register one in lib/ai/engine/registry.ts.`,
    )
  }

  // ── 2. Fetch context (DB) ────────────────────────────────────────────────────
  const context = await plugin.fetchContext(input)

  // ── 3. Fetch provider data (live/cached API) ──────────────────────────────────
  const providerResult = await plugin.fetchProviderData(context, input)
  const providerData = providerResult?.data ?? null
  const freshness: DataFreshnessTier = providerResult?.freshness ?? "pool_only"
  const fetchedAt: Date | null = providerResult?.fetchedAt ?? null

  // ── 4. Compute deterministic insights (NO AI) ─────────────────────────────────
  const insights = await plugin.computeInsights(context, providerData, input)

  // ── 5. Build grounding packet ─────────────────────────────────────────────────
  const groundingPacket = plugin.buildGroundingPacket(context, providerData, insights, input)

  // ── 6. AI call ────────────────────────────────────────────────────────────────
  const skipAi = input.skipAi === true || input.aiProfile === "deterministic"
  let aiResponse: string | null = null
  let aiModel: string | null = null
  let aiProvider: string | null = null
  let aiTokensUsed: number | null = null
  let aiCalled = false

  if (!skipAi) {
    const pluginSystemPrompt = plugin.buildSystemPrompt(input)
    const systemPrompt = [universalGroundingHeader(), pluginSystemPrompt].join("\n\n")

    const userContent = [
      "--- GROUNDING PACKET START ---",
      JSON.stringify(groundingPacket),
      "--- GROUNDING PACKET END ---",
      "",
      `User: ${input.userQuestion}`,
    ].join("\n")

    try {
      const result = await routeTextCall({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        // "cheap" → standard for non-war-room features to control cost
        profile:
          input.aiProfile === "premium"
            ? "premium"
            : input.aiProfile === "standard"
              ? "standard"
              : "cheap",
        temperature: 0.4,
        maxTokens: 520,
        skipCache: true,
      })
      if (result.ok) {
        aiResponse = result.text
        aiModel = result.model
        aiProvider = result.provider
        aiTokensUsed = result.tokensUsed
        aiCalled = true
      }
    } catch (err) {
      // Provider failure — return deterministic insights, no AI narrative
      console.error("[AIEngine] AI call failed:", err)
    }
  }

  // ── 7. Validate / sanitize ────────────────────────────────────────────────────
  if (aiResponse) {
    aiResponse = universalSanitize(aiResponse)
    if (plugin.validateResponse) {
      aiResponse = plugin.validateResponse(aiResponse, input)
    }
  }

  // ── 8. Return output ──────────────────────────────────────────────────────────
  const dataSource = buildDataSourceMeta(freshness, fetchedAt)
  return {
    sport: input.sport,
    feature: input.feature,
    insights,
    aiResponse,
    dataSource,
    groundingPacket,
    meta: {
      durationMs: Date.now() - start,
      aiModel,
      aiProvider,
      aiCalled,
      aiTokensUsed,
      deterministic: !aiCalled,
      pluginVersion: plugin.version,
    },
  }
}
