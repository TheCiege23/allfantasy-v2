import { prisma } from '../prisma'

export type AiOutputRole = 'narrative' | 'realtime' | 'quantitative'

export type AiOutputInput = {
  provider: 'openai' | 'grok' | 'deepseek' | string
  role: AiOutputRole | string
  taskType: string
  targetType?: string
  targetId?: string
  model?: string
  contentText?: string
  contentJson?: unknown
  confidence?: number
  meta?: Record<string, unknown>
  tokensPrompt?: number
  tokensCompletion?: number
}

export async function logAiOutput(input: AiOutputInput): Promise<void> {
  try {
    await (prisma as any).aiOutput.create({
      data: {
        provider: input.provider,
        role: input.role,
        taskType: input.taskType,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        model: input.model ?? null,
        contentText: input.contentText ?? null,
        contentJson: input.contentJson as any,
        confidence: input.confidence ?? null,
        meta: input.meta as any,
        tokensPrompt: input.tokensPrompt ?? null,
        tokensCompletion: input.tokensCompletion ?? null,
      },
    })
  } catch (e) {
    console.error('[ai/output-logger] Failed to persist AI output:', e)
  }
}

