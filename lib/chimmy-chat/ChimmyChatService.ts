import type { AIChatContext, ChimmyMessageMeta, ChimmyThreadMessage } from "./types"

type SendChimmyMessageInput = {
  message: string
  imageFile?: File | null
  conversation?: ChimmyThreadMessage[]
  context?: AIChatContext
}

type SendChimmyMessageResult = {
  ok: boolean
  response: string
  meta?: ChimmyMessageMeta
  error?: string
}

function toConversationPayload(conversation: ChimmyThreadMessage[] = []) {
  return conversation.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }))
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
  }
}

export async function sendChimmyMessage(input: SendChimmyMessageInput): Promise<SendChimmyMessageResult> {
  const formData = new FormData()
  formData.append("message", input.message)

  if (input.imageFile) formData.append("image", input.imageFile)
  if (input.context?.leagueId) formData.append("leagueId", input.context.leagueId)
  if (input.context?.sleeperUsername) formData.append("sleeperUsername", input.context.sleeperUsername)
  if (input.context?.insightType) formData.append("insightType", input.context.insightType)
  if (input.context?.teamId) formData.append("teamId", input.context.teamId)
  if (input.context?.sport) formData.append("sport", input.context.sport)
  if (typeof input.context?.season === "number") formData.append("season", String(input.context.season))
  if (typeof input.context?.week === "number") formData.append("week", String(input.context.week))

  const conversation = toConversationPayload(input.conversation)
  if (conversation.length > 0) {
    formData.append("messages", JSON.stringify(conversation))
  }

  const res = await fetch("/api/chat/chimmy", { method: "POST", body: formData })
  const data = await res.json().catch(() => ({}))
  const response = typeof data?.response === "string" ? data.response : ""
  const error =
    typeof data?.error === "string"
      ? data.error
      : typeof data?.message === "string"
        ? data.message
        : `Request failed (${res.status})`

  if (!res.ok) {
    return {
      ok: false,
      response: response || "I couldn't complete that request. Please try again.",
      error,
      meta: toMeta(data?.meta),
    }
  }

  return {
    ok: true,
    response: response || "I couldn't complete that request. Please try again.",
    meta: toMeta(data?.meta),
  }
}
