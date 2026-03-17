/**
 * ToolOutputFormatter — turns ToolOutput into display-ready text and section blocks.
 */

import type { ToolOutput } from "./types"

export interface FormattedSection {
  id: string
  title: string
  content: string
  type: "verdict" | "evidence" | "confidence" | "risks" | "next_action" | "alternate" | "narrative"
}

/**
 * Format confidence for display.
 */
export function formatConfidence(c: ToolOutput["confidence"]): string {
  if (typeof c === "number") {
    if (c >= 75) return "High confidence"
    if (c >= 50) return "Medium confidence"
    return "Confidence is limited"
  }
  const label = c.label === "high" ? "High" : c.label === "medium" ? "Medium" : "Limited"
  return c.pct != null ? `${label} confidence (${c.pct}%)` : `${label} confidence`
}

/**
 * Turn ToolOutput into ordered sections for UI (verdict, evidence, confidence, risks, next action, alternate).
 */
export function formatToolOutputToSections(output: ToolOutput): FormattedSection[] {
  const sections: FormattedSection[] = []

  sections.push({
    id: "verdict",
    title: "Verdict / Recommendation",
    content: output.verdict,
    type: "verdict",
  })

  if (output.keyEvidence?.length) {
    sections.push({
      id: "evidence",
      title: "Key Evidence",
      content: output.keyEvidence.map((e) => `• ${e}`).join("\n"),
      type: "evidence",
    })
  }

  sections.push({
    id: "confidence",
    title: "Confidence",
    content: formatConfidence(output.confidence),
    type: "confidence",
  })

  if (output.risksCaveats?.length) {
    sections.push({
      id: "risks",
      title: "Risks / Caveats",
      content: output.risksCaveats.map((r) => `• ${r}`).join("\n"),
      type: "risks",
    })
  }

  sections.push({
    id: "next_action",
    title: "Suggested Next Action",
    content: output.suggestedNextAction,
    type: "next_action",
  })

  if (output.alternatePath) {
    sections.push({
      id: "alternate",
      title: "Alternate Path",
      content: output.alternatePath,
      type: "alternate",
    })
  }

  if (output.narrative) {
    sections.push({
      id: "narrative",
      title: "Summary",
      content: output.narrative,
      type: "narrative",
    })
  }

  return sections
}

/**
 * One-line summary from ToolOutput (for chips, previews).
 */
export function formatToolOutputSummary(output: ToolOutput): string {
  return output.verdict.slice(0, 120) + (output.verdict.length > 120 ? "…" : "")
}
