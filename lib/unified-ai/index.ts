/**
 * Unified AI Interface — public API.
 * Deterministic-first, fact-grounded, 3-AI responsibility model.
 */

export * from "./types"
export * from "./AIContextEnvelopeBuilder"
export * from "./DeterministicToAIContextBridge"
export * from "./ModelRoutingResolver"
export * from "./AIFactGuard"
export * from "./AIConfidenceResolver"
export * from "./SportAIResolver"
export * from "./ToolAIEntryResolver"
export * from "./ConsensusEvaluator"
export * from "./UnifiedBrainComposer"
export * from "./AIOrchestrator"

import { deepseekChat } from "@/lib/deepseek-client"
import { openaiChatText } from "@/lib/openai-client"
import { xaiChatJson } from "@/lib/xai-client"
import type { AIModelRole } from "./types"

type LegacyGenerateWithAIOptions = {
	model?: AIModelRole
	prompt: string
	temperature?: number
	maxTokens?: number
	systemPrompt?: string
}

export async function GenerateWithAI(
	options: LegacyGenerateWithAIOptions,
	_mode?: "analysis" | "explanation" | string,
): Promise<string> {
	const {
		model = "openai",
		prompt,
		temperature = 0.7,
		maxTokens = 700,
		systemPrompt = "You are a grounded fantasy sports assistant. Use only the provided context and do not invent facts.",
	} = options

	if (model === "deepseek") {
		const result = await deepseekChat({
			prompt,
			systemPrompt,
			temperature,
			maxTokens,
		})
		if (!result.error && result.content.trim()) return result.content.trim()
	}

	if (model === "grok") {
		const result = await xaiChatJson({
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: prompt },
			],
			temperature,
			maxTokens,
		})
		if (result.ok) {
			const content = result.json?.choices?.[0]?.message?.content
			if (typeof content === "string" && content.trim()) return content.trim()
		}
	}

	const openaiResult = await openaiChatText({
		messages: [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: prompt },
		],
		temperature,
		maxTokens,
	})

	if (openaiResult.ok && openaiResult.text.trim()) return openaiResult.text.trim()

	return ""
}
