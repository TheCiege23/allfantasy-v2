/**
 * AI Social Clip Engine — prompt builders per input/output type and provider (PROMPT 146).
 */

import { normalizeToSupportedSport } from "@/lib/sport-scope";
import type {
  ClipInputType,
  ClipOutputType,
  DeterministicFacts,
  AIClipGenerateInput,
} from "./types";

const INPUT_LABELS: Record<ClipInputType, string> = {
  matchup_result: "matchup result",
  trade_verdict: "trade verdict",
  power_rankings: "power rankings",
  player_trend_alert: "player trend alert",
  story_recap: "story recap",
  creator_league_promo: "creator league promo",
  bracket_update: "bracket update",
};

const OUTPUT_LABELS: Record<ClipOutputType, string> = {
  short_post: "short post (feed)",
  thread_format: "thread format (multiple tweets)",
  image_caption: "image caption",
  video_caption: "video caption",
  promo_copy: "promo copy",
  recap_copy: "recap copy",
};

function factsBlock(facts: DeterministicFacts | undefined): string {
  if (!facts || Object.keys(facts).length === 0) return "";
  const lines = Object.entries(facts)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `- ${k}: ${String(v)}`);
  return `\nDETERMINISTIC FACTS (use exactly; do not invent):\n${lines.join("\n")}`;
}

/** xAI: narrative framing, punchy social language, viral angle. */
export function buildXaiSystemPrompt(input: AIClipGenerateInput): string {
  const sport = normalizeToSupportedSport(input.sport);
  const inputLabel = INPUT_LABELS[input.inputType];
  const outputLabel = OUTPUT_LABELS[input.outputType];
  const branding = input.brandingHint ?? "AllFantasy — fantasy sports insights";
  const tone = input.tone ?? "punchy and shareable";

  return `You are a viral social copywriter for fantasy sports. Your job is NARRATIVE FRAMING and PUNCHY SOCIAL LANGUAGE.

Context:
- Sport: ${sport}
- Input type: ${inputLabel}
- Output format: ${outputLabel}
- Tone: ${tone}
- Branding: ${branding}
${factsBlock(input.deterministicFacts)}

Generate a viral angle and raw social copy. Output valid JSON only with these keys:
- headline: string (under 80 chars, hook)
- shortCaption: string (1-2 sentences, under 200 chars)
- ctaText: string (under 50 chars)
- hashtags: array of 3-6 hashtag strings
- socialCardCopy: string (under 150 chars for card overlay)
- clipTitle: string (under 60 chars)
- thread: array of strings (only if output is thread_format; each under 280 chars)

No placeholder text. Be punchy and sport-aware.`;
}

export function buildXaiUserPrompt(input: AIClipGenerateInput): string {
  return `Generate viral social copy for: ${INPUT_LABELS[input.inputType]}. Output: ${OUTPUT_LABELS[input.outputType]}. Return only the JSON object.`;
}

/** DeepSeek: structured fact review, consistency with deterministic facts. */
export function buildDeepSeekSystemPrompt(): string {
  return `You are a fact-checker for fantasy sports social copy. You verify that the copy is consistent with the provided DETERMINISTIC FACTS. Do not invent stats or outcomes. Respond in JSON only: { "pass": true|false, "issues": string[] }. If pass is false, list specific inconsistencies.`;
}

export function buildDeepSeekUserPrompt(
  facts: DeterministicFacts | undefined,
  copyToCheck: string
): string {
  const factsStr = facts ? JSON.stringify(facts) : "No facts provided.";
  return `FACTS:\n${factsStr}\n\nCOPY TO CHECK:\n${copyToCheck}\n\nReturn JSON: { "pass": boolean, "issues": string[] }`;
}

/** OpenAI: polished final copy, clean CTA, user-facing preview quality. */
export function buildOpenAISystemPrompt(input: AIClipGenerateInput): string {
  const sport = normalizeToSupportedSport(input.sport);
  const outputLabel = OUTPUT_LABELS[input.outputType];
  const branding = input.brandingHint ?? "AllFantasy";

  return `You are a professional social copy editor for fantasy sports. Polish the draft into PREVIEW-QUALITY final copy. Keep it clean, on-brand, and accurate.

Sport: ${sport}. Output: ${outputLabel}. Branding: ${branding}.
${factsBlock(input.deterministicFacts)}

Output valid JSON only with these exact keys:
- shortCaption: string (under 200 chars)
- headline: string (under 80 chars)
- ctaText: string (under 50 chars, clear CTA)
- hashtags: array of 3-6 strings
- socialCardCopy: string (under 150 chars)
- clipTitle: string (under 60 chars)
- platformVariants: optional object with keys "x", "instagram", "tiktok", "facebook"; each value: { caption: string, hashtags: string[] }
- thread: optional array of strings (if thread format; each under 280 chars)

Preserve meaning; improve clarity and CTA. No placeholders.`;
}

export function buildOpenAIUserPrompt(draftJson: string): string {
  return `Polish this draft into final preview-quality copy. Return only the JSON object.\n\nDraft:\n${draftJson}`;
}
