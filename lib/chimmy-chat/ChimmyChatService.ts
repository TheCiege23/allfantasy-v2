import type { AIChatContext, ChimmyMessageMeta, ChimmyThreadMessage } from "./types"
import {
  CHIMMY_DEFAULT_UPGRADE_PATH,
  CHIMMY_GENERIC_ERROR_MESSAGE,
  CHIMMY_PREMIUM_CTA_LABEL,
  CHIMMY_PREMIUM_FEATURE_MESSAGE,
  isChimmyPremiumGateResponse,
  resolveChimmyUpgradePath,
} from "@/lib/chimmy-chat/response-copy"
import { confirmTokenSpend } from "@/lib/tokens/client-confirm"

type SendChimmyMessageInput = {
  message: string
  imageFile?: File | null
  conversation?: ChimmyThreadMessage[]
  context?: AIChatContext
  confirmTokenSpend?: boolean
  onChunk?: (text: string) => void
}

type SendChimmyMessageResult = {
  ok: boolean
  response: string
  meta?: ChimmyMessageMeta
  error?: string
  upgradeRequired?: boolean
  upgradePath?: string
  sessionId?: string
}

function toConversationPayload(conversation: ChimmyThreadMessage[] = []) {
  return conversation.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }))
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string" && reader.result.length > 0) {
        resolve(reader.result)
        return
      }
      reject(new Error("Failed to encode image upload."))
    }
    reader.onerror = () => reject(new Error("Failed to read image upload."))
    reader.readAsDataURL(file)
  })
}

function toMeta(rawMeta: unknown): ChimmyMessageMeta | undefined {
  if (!rawMeta || typeof rawMeta !== "object" || Array.isArray(rawMeta)) return undefined
  const meta = rawMeta as Record<string, unknown>
  const responseStructureRaw =
    meta.responseStructure && typeof meta.responseStructure === "object" && !Array.isArray(meta.responseStructure)
      ? (meta.responseStructure as Record<string, unknown>)
      : null
  const shortAnswer =
    typeof responseStructureRaw?.shortAnswer === "string" ? responseStructureRaw.shortAnswer.trim() : ""
  const caveats = Array.isArray(responseStructureRaw?.caveats)
    ? responseStructureRaw.caveats.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : []

  return {
    confidencePct: typeof meta.confidencePct === "number" ? meta.confidencePct : undefined,
    providerStatus:
      meta.providerStatus && typeof meta.providerStatus === "object" && !Array.isArray(meta.providerStatus)
        ? (meta.providerStatus as Record<string, string>)
        : undefined,
    recommendedTool: typeof meta.recommendedTool === "string" ? meta.recommendedTool : undefined,
    dataSources: Array.isArray(meta.dataSources) ? meta.dataSources.filter((x): x is string => typeof x === "string") : undefined,
    quantData: meta.quantData && typeof meta.quantData === "object" ? (meta.quantData as Record<string, unknown>) : undefined,
    trendData: meta.trendData && typeof meta.trendData === "object" ? (meta.trendData as Record<string, unknown>) : undefined,
    responseStructure:
      shortAnswer.length > 0
        ? {
            shortAnswer,
            whatDataSays:
              typeof responseStructureRaw?.whatDataSays === "string" ? responseStructureRaw.whatDataSays : undefined,
            whatItMeans:
              typeof responseStructureRaw?.whatItMeans === "string" ? responseStructureRaw.whatItMeans : undefined,
            recommendedAction:
              typeof responseStructureRaw?.recommendedAction === "string"
                ? responseStructureRaw.recommendedAction
                : undefined,
            caveats,
          }
        : undefined,
    variant:
      meta.variant === "premium_gate" || meta.variant === "error"
        ? meta.variant
        : undefined,
    ctaLabel: typeof meta.ctaLabel === "string" ? meta.ctaLabel : undefined,
    ctaHref: typeof meta.ctaHref === "string" ? meta.ctaHref : undefined,
  }
}

export async function sendChimmyMessage(input: SendChimmyMessageInput): Promise<SendChimmyMessageResult> {
  let shouldConfirmTokenSpend = input.confirmTokenSpend ?? true
  if (shouldConfirmTokenSpend) {
    try {
      const { confirmed, preview } = await confirmTokenSpend("ai_chimmy_chat_message")
      if (!preview.canSpend) {
        return {
          ok: true,
          response: CHIMMY_PREMIUM_FEATURE_MESSAGE,
          meta: {
            variant: "premium_gate",
            ctaLabel: CHIMMY_PREMIUM_CTA_LABEL,
            ctaHref: CHIMMY_DEFAULT_UPGRADE_PATH,
          },
          upgradeRequired: true,
          upgradePath: CHIMMY_DEFAULT_UPGRADE_PATH,
        }
      }
      if (!confirmed) {
        return {
          ok: false,
          response: "Token spend cancelled.",
          error: "Token spend cancelled by user.",
        }
      }
    } catch (error) {
      console.error(
        "[sendChimmyMessage] Token preview failed, continuing without preflight:",
        error instanceof Error ? error.message : error
      )
      shouldConfirmTokenSpend = false
    }
  }

  const conversation = toConversationPayload(input.conversation)
  const imageDataUrl =
    input.imageFile && input.imageFile.size > 0 ? await fileToDataUrl(input.imageFile) : undefined
  const payload = {
    message: input.message,
    stream: typeof input.onChunk === "function",
    confirmTokenSpend: shouldConfirmTokenSpend,
    conversation: conversation.length > 0 ? conversation : undefined,
    image: imageDataUrl
      ? {
          dataUrl: imageDataUrl,
          name: input.imageFile?.name || undefined,
          type: input.imageFile?.type || undefined,
        }
      : undefined,
    userContext: {
      leagueId: input.context?.leagueId,
      sleeperUsername: input.context?.sleeperUsername,
      insightType: input.context?.insightType,
      teamId: input.context?.teamId,
      sport: input.context?.sport,
      leagueFormat: input.context?.leagueFormat,
      scoring: input.context?.scoring,
      season: input.context?.season,
      week: input.context?.week,
      conversationId: input.context?.conversationId,
      sessionId: input.context?.sessionId,
      privateMode: input.context?.privateMode,
      targetUsername: input.context?.targetUsername,
      strategyMode: input.context?.strategyMode,
      source: input.context?.source,
      memory: input.context?.memory,
    },
  }

  const res = await fetch("/api/chimmy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const contentType = res.headers.get("content-type") || ""
  let data: any = {}

  if (contentType.includes("text/event-stream") && res.body) {
    const decoder = new TextDecoder()
    const reader = res.body.getReader()
    let buffer = ""
    let responseText = ""

    const processEvent = (rawBlock: string) => {
      const lines = rawBlock
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
      let event = "message"
      const dataLines: string[] = []

      for (const line of lines) {
        if (line.startsWith("event:")) {
          event = line.slice(6).trim()
          continue
        }
        if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim())
        }
      }

      const payloadRaw = dataLines.join("\n")
      const eventPayload = payloadRaw ? JSON.parse(payloadRaw) : {}

      if (event === "chunk") {
        const nextText =
          typeof eventPayload?.response === "string"
            ? eventPayload.response
            : typeof eventPayload?.delta === "string"
              ? responseText + eventPayload.delta
              : responseText
        responseText = nextText
        input.onChunk?.(responseText)
        return
      }

      if (event === "done") {
        data = eventPayload
        if (!responseText && typeof eventPayload?.response === "string") {
          responseText = eventPayload.response
          input.onChunk?.(responseText)
        }
        return
      }

      if (event === "error") {
        throw new Error(
          typeof eventPayload?.error === "string" ? eventPayload.error : "Chimmy stream failed"
        )
      }
    }

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const normalized = buffer.replace(/\r\n/g, "\n")
      let boundary = normalized.indexOf("\n\n")
      if (boundary === -1) {
        buffer = normalized
        continue
      }
      let working = normalized
      while (boundary !== -1) {
        const block = working.slice(0, boundary)
        working = working.slice(boundary + 2)
        if (block.trim().length > 0) {
          processEvent(block)
        }
        boundary = working.indexOf("\n\n")
      }
      buffer = working
    }

    if (!data.response && responseText) {
      data = { response: responseText, result: responseText }
    }
  } else {
    data = await res.json().catch(() => ({}))
  }

  const response =
    typeof data?.result === "string"
      ? data.result
      : typeof data?.response === "string"
        ? data.response
        : ""
  const upgradeRequired = isChimmyPremiumGateResponse({
    status: res.status,
    code: data?.code,
    upgradeRequired: data?.upgradeRequired,
  })
  const upgradePath = upgradeRequired
    ? resolveChimmyUpgradePath(data?.upgradePath)
    : undefined
  const metaCandidate = {
    ...(toMeta(data?.meta) ?? {}),
    ...(upgradeRequired
      ? {
          variant: "premium_gate" as const,
          ctaLabel: CHIMMY_PREMIUM_CTA_LABEL,
          ctaHref: upgradePath ?? CHIMMY_DEFAULT_UPGRADE_PATH,
        }
      : !res.ok
        ? {
            variant: "error" as const,
          }
        : {}),
  }
  const meta = Object.keys(metaCandidate).length > 0 ? metaCandidate : undefined
  const error =
    upgradeRequired
      ? undefined
      : typeof data?.error === "string"
      ? data.error
      : typeof data?.message === "string"
        ? data.message
        : res.status >= 500
          ? CHIMMY_GENERIC_ERROR_MESSAGE
          : `Request failed (${res.status})`
  const fallbackResponse = upgradeRequired
    ? CHIMMY_PREMIUM_FEATURE_MESSAGE
    : CHIMMY_GENERIC_ERROR_MESSAGE

  if (!res.ok && !upgradeRequired) {
    return {
      ok: false,
      response: response || fallbackResponse,
      error: error || CHIMMY_GENERIC_ERROR_MESSAGE,
      meta,
    }
  }

  return {
    ok: true,
    response: response || fallbackResponse,
    meta,
    sessionId: typeof data?.sessionId === "string" ? data.sessionId : undefined,
    ...(upgradeRequired
      ? {
          upgradeRequired: true,
          upgradePath,
        }
      : {}),
  }
}
