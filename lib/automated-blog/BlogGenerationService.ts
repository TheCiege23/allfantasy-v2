/**
 * BlogGenerationService — multi-provider blog draft generation (PROMPT 147).
 * DeepSeek: outline + stat sanity. xAI: narrative energy + angles. OpenAI: final blog writing.
 */

import { deepseekChat } from "@/lib/deepseek-client"
import { xaiChatJson, parseTextFromXaiChatCompletion } from "@/lib/xai-client"
import { openaiChatJson, parseJsonContentFromChatCompletion, getOpenAIConfig } from "@/lib/openai-client"
import { normalizeToSupportedSport } from "@/lib/sport-scope"
import { isXaiAvailable, isDeepSeekAvailable } from "@/lib/provider-config"
import type { BlogDraftInput, GeneratedDraft } from "./types"
import { CONTENT_TYPE_PROMPTS } from "./types"
import { BLOG_CATEGORY_LABELS } from "./types"

const SLUG_MAX = 120

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, SLUG_MAX)
}

function ensureSlug(raw: string | undefined): string {
  if (typeof raw === "string" && /^[a-z0-9-]+$/.test(raw)) return raw.slice(0, SLUG_MAX)
  return toSlug(String(raw ?? "article"))
}

function parseJsonFromText(text: string): Record<string, unknown> | null {
  const trimmed = text.trim()
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}") + 1
  if (start === -1 || end <= start) return null
  try {
    return JSON.parse(trimmed.slice(start, end)) as Record<string, unknown>
  } catch {
    return null
  }
}

function isOpenAIConfigured(): boolean {
  try {
    getOpenAIConfig()
    return true
  } catch {
    return false
  }
}

function isXaiConfigured(): boolean {
  return isXaiAvailable()
}

function isDeepSeekConfigured(): boolean {
  return isDeepSeekAvailable()
}

/** DeepSeek: structured outline and stat/ordering suggestions. */
async function runDeepSeekOutline(input: BlogDraftInput): Promise<{ outline: string[]; keyStats?: string[] } | null> {
  if (!isDeepSeekConfigured()) return null
  const sport = normalizeToSupportedSport(input.sport)
  const categoryLabel = BLOG_CATEGORY_LABELS[input.category] ?? input.category
  const prompt = `You are a fantasy sports content planner. Create a structured outline for an SEO-friendly blog article.

Sport: ${sport}
Category: ${categoryLabel}
Topic: ${input.topicHint ?? "general"}

Return valid JSON only: { "outline": string[] (3-6 section headings or bullet points), "keyStats": string[] (optional, 2-5 stat or fact suggestions to include) }`

  try {
    const res = await deepseekChat({
      prompt,
      systemPrompt: "You are a content strategist. Respond only with valid JSON. No markdown.",
      temperature: 0.3,
      maxTokens: 600,
    })
    if (res.error || !res.content) return null
    const parsed = parseJsonFromText(res.content)
    if (!parsed || !Array.isArray(parsed.outline)) return null
    return {
      outline: (parsed.outline as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 8),
      keyStats: Array.isArray(parsed.keyStats)
        ? (parsed.keyStats as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 5)
        : undefined,
    }
  } catch {
    return null
  }
}

/** xAI: narrative angles and social hook. */
async function runXaiAngles(
  input: BlogDraftInput,
  outline: { outline: string[]; keyStats?: string[] } | null
): Promise<{ angles: string[]; socialHook: string } | null> {
  if (!isXaiConfigured()) return null
  const sport = normalizeToSupportedSport(input.sport)
  const categoryLabel = BLOG_CATEGORY_LABELS[input.category] ?? input.category
  const outlineStr = outline?.outline?.length ? outline.outline.join("\n") : "General article"
  const userMessage = `Sport: ${sport}. Category: ${categoryLabel}. Topic: ${input.topicHint ?? "general"}.

Outline:\n${outlineStr}

Generate narrative angles and a social hook for this blog. Return valid JSON only: { "angles": string[] (2-4 short angle ideas), "socialHook": string (one punchy sentence for social share) }`

  try {
    const res = await xaiChatJson({
      messages: [
        {
          role: "system",
          content:
            "You are a viral fantasy sports content strategist. Output only valid JSON. No markdown code blocks.",
        },
        { role: "user", content: userMessage },
      ],
      temperature: 0.5,
      maxTokens: 400,
      responseFormat: { type: "json_object" },
    })
    if (!res.ok) return null
    const text = parseTextFromXaiChatCompletion(res.json)
    const parsed = text ? parseJsonFromText(text) : null
    if (!parsed) return null
    const angles = Array.isArray(parsed.angles)
      ? (parsed.angles as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 4)
      : []
    const socialHook =
      typeof parsed.socialHook === "string" && parsed.socialHook.trim()
        ? String(parsed.socialHook).trim().slice(0, 200)
        : ""
    return { angles, socialHook }
  } catch {
    return null
  }
}

/** OpenAI: final blog draft (structure, headline/subhead, readability). */
async function runOpenAIFinal(
  input: BlogDraftInput,
  outline: { outline: string[]; keyStats?: string[] } | null,
  angles: { angles: string[]; socialHook: string } | null
): Promise<GeneratedDraft | null> {
  if (!isOpenAIConfigured()) return null
  const config = CONTENT_TYPE_PROMPTS[input.category]
  if (!config) return null

  const sport = normalizeToSupportedSport(input.sport)
  const outlineBlock = outline?.outline?.length
    ? `\nSuggested outline (use to structure the body):\n${outline.outline.map((h) => `- ${h}`).join("\n")}`
    : ""
  const statsBlock =
    outline?.keyStats?.length ? `\nKey stats/facts to consider including:\n${outline.keyStats.join("\n")}` : ""
  const anglesBlock =
    angles?.angles?.length || angles?.socialHook
      ? `\nNarrative angles: ${angles?.angles?.join("; ") ?? "—"}. Social hook: ${angles?.socialHook ?? "—"}`
      : ""

  const userParts = [
    config.userPrefix,
    `Sport: ${sport}.`,
    input.topicHint ? `Topic focus: ${input.topicHint}` : "",
    outlineBlock,
    statsBlock,
    anglesBlock,
  ].filter(Boolean)
  const userMessage = userParts.join(" ")

  const res = await openaiChatJson({
    messages: [
      { role: "system", content: config.system },
      { role: "user", content: userMessage },
    ],
    temperature: 0.6,
    maxTokens: 3000,
  })
  if (!res.ok) return null
  const json = parseJsonContentFromChatCompletion(res.json)
  if (!json || typeof json !== "object") return null

  const title = typeof json.title === "string" ? json.title.trim() : "Untitled"
  const body = typeof json.body === "string" ? json.body.trim() : ""
  const excerpt = typeof json.excerpt === "string" ? json.excerpt.trim() : body.slice(0, 200)
  const slug = ensureSlug(json.slug ?? title)
  const seoTitle =
    typeof json.seoTitle === "string" ? json.seoTitle.trim().slice(0, 60) : title.slice(0, 60)
  const seoDescription =
    typeof json.seoDescription === "string"
      ? json.seoDescription.trim().slice(0, 160)
      : excerpt.slice(0, 160)
  const tags = Array.isArray(json.tags)
    ? (json.tags as unknown[]).filter((t): t is string => typeof t === "string").slice(0, 10)
    : []

  return {
    title: title.slice(0, 512),
    slug,
    excerpt,
    body,
    seoTitle,
    seoDescription,
    tags,
  }
}

/**
 * Generate a blog draft using multi-provider pipeline when available.
 * Fallback: OpenAI-only (caller can use BlogContentGenerator.generateBlogDraft).
 */
export async function generateBlogDraftMultiProvider(
  input: BlogDraftInput
): Promise<GeneratedDraft | null> {
  const outline = await runDeepSeekOutline(input)
  const angles = await runXaiAngles(input, outline)
  const draft = await runOpenAIFinal(input, outline, angles)
  return draft
}

export function isBlogMultiProviderAvailable(): boolean {
  return isOpenAIConfigured()
}

export function getBlogProviderStatus(): { openai: boolean; xai: boolean; deepseek: boolean } {
  return {
    openai: isOpenAIConfigured(),
    xai: isXaiConfigured(),
    deepseek: isDeepSeekConfigured(),
  }
}
