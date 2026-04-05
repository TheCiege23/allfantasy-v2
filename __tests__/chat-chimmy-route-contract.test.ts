import { beforeEach, describe, expect, it, vi } from "vitest"

import { createMockNextRequest } from "@/__tests__/helpers/createMockNextRequest"
const getServerSessionMock = vi.fn()
const runAiProtectionMock = vi.fn()
const runUnifiedOrchestrationMock = vi.fn()
const requestContractToUnifiedMock = vi.fn()
const unifiedResponseToContractMock = vi.fn()
const validateToolRequestMock = vi.fn()
const buildChimmyConversationIdMock = vi.fn()
const buildAgentPromptMock = vi.fn()
const inferAgentFromMessageMock = vi.fn()
const getChimmyMemoryContextMock = vi.fn()
const previewSpendMock = vi.fn()
const spendTokensForRuleMock = vi.fn()
const refundSpendByLedgerMock = vi.fn()
const supabaseInsertMock = vi.fn()
const supabaseFromMock = vi.fn()

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/ai-protection", () => ({
  runAiProtection: runAiProtectionMock,
}))

vi.mock("@/lib/ai-orchestration/orchestration-service", () => ({
  runUnifiedOrchestration: runUnifiedOrchestrationMock,
}))

vi.mock("@/lib/ai-tool-registry", () => ({
  requestContractToUnified: requestContractToUnifiedMock,
  unifiedResponseToContract: unifiedResponseToContractMock,
  validateToolRequest: validateToolRequestMock,
}))

vi.mock("@/lib/ai-simulation-integration", () => ({
  getInsightBundle: vi.fn(),
}))

vi.mock("@/lib/sport-scope", () => ({
  normalizeToSupportedSport: (value?: string | null) => value ?? "NFL",
}))

vi.mock("@/lib/ai-memory/chimmy-memory-context", () => ({
  getChimmyMemoryContext: getChimmyMemoryContextMock,
}))

vi.mock("@/lib/ai-memory/chat-history-store", () => ({
  appendChatHistory: vi.fn(),
  buildChimmyConversationId: buildChimmyConversationIdMock,
}))

vi.mock("@/lib/ai-memory/ai-memory-store", () => ({
  rememberChimmyAssistantMemory: vi.fn(),
  rememberChimmyUserMessageMemory: vi.fn(),
}))

vi.mock("@/lib/agents/pipeline", () => ({
  buildAgentPrompt: buildAgentPromptMock,
  inferAgentFromMessage: inferAgentFromMessageMock,
}))

vi.mock("@/lib/tokens/TokenSpendService", () => ({
  TokenInsufficientBalanceError: class TokenInsufficientBalanceError extends Error {},
  TokenSpendConfirmationRequiredError: class TokenSpendConfirmationRequiredError extends Error {},
  TokenSpendRuleNotFoundError: class TokenSpendRuleNotFoundError extends Error {},
  TokenSpendService: class {
    previewSpend = previewSpendMock
    spendTokensForRule = spendTokensForRuleMock
    refundSpendByLedger = refundSpendByLedgerMock
  },
}))

vi.mock("@/lib/supabaseClient", () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: supabaseFromMock,
  },
}))

function buildMultipartRequest(formData?: FormData) {
  return createMockNextRequest("http://localhost/api/chat/chimmy", {
    method: "POST",
    body: formData ?? new FormData(),
  })
}

describe("POST /api/chat/chimmy contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    runAiProtectionMock.mockResolvedValue(null)
    validateToolRequestMock.mockReturnValue({ valid: true })
    buildChimmyConversationIdMock.mockReturnValue("conversation-1")
    buildAgentPromptMock.mockImplementation(async ({ userMessage }: { userMessage: string }) => userMessage)
    inferAgentFromMessageMock.mockReturnValue("trade_analyzer")
    getChimmyMemoryContextMock.mockResolvedValue({ promptSection: "" })
    previewSpendMock.mockResolvedValue({
      ruleCode: "ai_chimmy_chat_message",
      tokenCost: 1,
      canSpend: true,
      currentBalance: 10,
    })
    spendTokensForRuleMock.mockResolvedValue({
      id: "ledger-1",
      balanceAfter: 9,
    })
    refundSpendByLedgerMock.mockResolvedValue(null)
    requestContractToUnifiedMock.mockReturnValue({ envelope: {} })
    unifiedResponseToContractMock.mockReturnValue({
      aiExplanation: "Accept the trade.",
      actionPlan: "Send the offer now.",
      confidence: 84,
      uncertainty: null,
      providerResults: [],
      reliability: null,
      debugTrace: {
        providerUsed: "openai",
      },
    })
    runUnifiedOrchestrationMock.mockResolvedValue({
      ok: true,
      response: {
        modelOutputs: [
          {
            model: "openai",
            modelName: "gpt-4o-mini",
            raw: "Accept the trade.",
            skipped: false,
            tokensPrompt: 120,
            tokensCompletion: 45,
          },
        ],
      },
    })
    supabaseInsertMock.mockResolvedValue({ data: null, error: null })
    supabaseFromMock.mockReturnValue({
      insert: supabaseInsertMock,
    })
  })

  it("returns 401 when unauthenticated", async () => {
    getServerSessionMock.mockResolvedValueOnce(null)

    const { POST } = await import("@/app/api/chat/chimmy/route")
    const res = await POST(buildMultipartRequest() as any)

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" })
  })

  it("returns rate limit response from AI protection", async () => {
    runAiProtectionMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60" },
      })
    )

    const { POST } = await import("@/app/api/chat/chimmy/route")
    const res = await POST(buildMultipartRequest() as any)

    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("60")
    await expect(res.json()).resolves.toEqual({ error: "Too many requests" })
  })

  it("returns 400 for malformed conversation JSON", async () => {
    const formData = new FormData()
    formData.append("message", "Should I trade for this player?")
    formData.append("messages", "{not json")

    const { POST } = await import("@/app/api/chat/chimmy/route")
    const res = await POST(buildMultipartRequest(formData) as any)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "Conversation payload must be valid JSON.",
    })
  })

  it("returns 400 for invalid numeric fields", async () => {
    const formData = new FormData()
    formData.append("message", "How should I set my lineup?")
    formData.append("week", "abc")

    const { POST } = await import("@/app/api/chat/chimmy/route")
    const res = await POST(buildMultipartRequest(formData) as any)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      error: "Invalid request format.",
      details: {
        fieldErrors: {
          week: expect.any(Array),
        },
      },
    })
  })

  it("returns 400 for unsupported screenshot types", async () => {
    const formData = new FormData()
    formData.append("message", "Analyze this screenshot")
    formData.append("image", new File(["hello"], "notes.txt", { type: "text/plain" }))

    const { POST } = await import("@/app/api/chat/chimmy/route")
    const res = await POST(buildMultipartRequest(formData) as any)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "Unsupported image type. Use JPEG, PNG, GIF, or WebP.",
    })
  })

  it("continues through the existing Chimmy flow when image vision is unavailable", async () => {
    const originalAiIntegrationsKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY
    const originalOpenAiKey = process.env.OPENAI_API_KEY
    delete process.env.AI_INTEGRATIONS_OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY

    try {
      const formData = new FormData()
      formData.append("message", "Analyze this screenshot")
      formData.append("confirmTokenSpend", "true")
      formData.append("image", new File(["fake-image"], "screenshot.png", { type: "image/png" }))

      const { POST } = await import("@/app/api/chat/chimmy/route")
      const res = await POST(buildMultipartRequest(formData) as any)

      expect(res.status).toBe(200)
      expect(buildAgentPromptMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userMessage: expect.stringContaining(
            "SCREENSHOT SUMMARY:\nImage uploaded; vision extraction unavailable (provider not configured)."
          ),
          deterministicContext: expect.objectContaining({
            screenshotEvidence: "Image uploaded; vision extraction unavailable (provider not configured).",
          }),
        })
      )
      expect(runUnifiedOrchestrationMock).toHaveBeenCalledTimes(1)
      await expect(res.json()).resolves.toMatchObject({
        response: "Accept the trade.",
      })
    } finally {
      if (originalAiIntegrationsKey == null) {
        delete process.env.AI_INTEGRATIONS_OPENAI_API_KEY
      } else {
        process.env.AI_INTEGRATIONS_OPENAI_API_KEY = originalAiIntegrationsKey
      }

      if (originalOpenAiKey == null) {
        delete process.env.OPENAI_API_KEY
      } else {
        process.env.OPENAI_API_KEY = originalOpenAiKey
      }
    }
  })

  it("returns 400 when message exceeds the maximum length", async () => {
    const formData = new FormData()
    formData.append("message", "x".repeat(4001))

    const { POST } = await import("@/app/api/chat/chimmy/route")
    const res = await POST(buildMultipartRequest(formData) as any)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      error: "Invalid request format.",
      details: {
        fieldErrors: {
          message: expect.any(Array),
        },
      },
    })
  })

  it("logs Supabase usage after a successful Chimmy run", async () => {
    const formData = new FormData()
    formData.append("message", "Should I trade this player?")
    formData.append("confirmTokenSpend", "true")
    formData.append("leagueFormat", "dynasty")
    formData.append("scoring", "PPR")
    formData.append("tone", "strategic")
    formData.append("detailLevel", "concise")
    formData.append("riskMode", "balanced")

    const { POST } = await import("@/app/api/chat/chimmy/route")
    const res = await POST(buildMultipartRequest(formData) as any)

    expect(res.status).toBe(200)
    expect(supabaseFromMock).toHaveBeenCalledWith("usage_logs")
    expect(supabaseInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        intent: "trade_analyzer",
        tokens_used: 165,
        model: "gpt-4o-mini",
        created_at: expect.any(String),
      })
    )
  })

  it("continues the Chimmy run when token preview fails", async () => {
    previewSpendMock.mockRejectedValueOnce(new Error("monetization context exploded"))

    const formData = new FormData()
    formData.append("message", "Should I trade this player?")

    const { POST } = await import("@/app/api/chat/chimmy/route")
    const res = await POST(buildMultipartRequest(formData) as any)

    expect(res.status).toBe(200)
    expect(spendTokensForRuleMock).not.toHaveBeenCalled()
    await expect(res.json()).resolves.toMatchObject({
      response: "Accept the trade.",
    })
  })

  it("skips token confirmation when preview does not require confirmation", async () => {
    previewSpendMock.mockResolvedValueOnce({
      ruleCode: "ai_chimmy_chat_message",
      tokenCost: 0,
      canSpend: true,
      currentBalance: 999999999,
      requiresConfirmation: false,
    })

    const formData = new FormData()
    formData.append("message", "Should I trade this player?")

    const { POST } = await import("@/app/api/chat/chimmy/route")
    const res = await POST(buildMultipartRequest(formData) as any)

    expect(res.status).toBe(200)
    expect(spendTokensForRuleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmed: false,
        ruleCode: "ai_chimmy_chat_message",
      })
    )
    await expect(res.json()).resolves.toMatchObject({
      response: "Accept the trade.",
    })
  })

  it("strips raw JSON context blobs from the displayed response text", async () => {
    unifiedResponseToContractMock.mockReturnValueOnce({
      aiExplanation:
        'Deterministic guidance from NFL context: {"contextSnapshot":{"sport":"NFL","week":7}} Start Drake London over Christian Watson this week.',
      actionPlan: "Lock it in before kickoff.",
      confidence: 84,
      uncertainty: null,
      providerResults: [],
      reliability: null,
      debugTrace: {
        providerUsed: "openai",
      },
    })

    const formData = new FormData()
    formData.append("message", "Who should I start?")
    formData.append("confirmTokenSpend", "true")

    const { POST } = await import("@/app/api/chat/chimmy/route")
    const res = await POST(buildMultipartRequest(formData) as any)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      response: "Start Drake London over Christian Watson this week.",
    })
  })
})
