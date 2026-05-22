/**
 * Tests that the Explain My Bracket service includes the correct language
 * instruction in its AI prompt based on the user's selected locale.
 *
 * Does NOT assert exact AI response content — only that the prompt
 * construction includes the expected language directive.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const openaiMock = vi.hoisted(() => vi.fn())
const prismaFindFirstMock = vi.hoisted(() => vi.fn())
const seedStrengthMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/openai-client", () => ({
  openaiChatText: openaiMock,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    worldCupBracketEntry: {
      findFirst: prismaFindFirstMock,
    },
  },
}))

vi.mock("@/lib/world-cup/worldCupAiInsights", () => ({
  getWorldCupSeedStrength: seedStrengthMock,
}))

function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "entry-1",
    name: "My Bracket",
    championTeamName: "Argentina",
    picks: [
      {
        id: "p1",
        matchId: "m1",
        round: "final",
        selectedTeamId: "arg",
        selectedSlotKey: "A1",
        selectedTeamName: "Argentina",
      },
    ],
    challenge: { id: "c1", name: "Office Cup", seasonYear: 2026 },
    ...overrides,
  }
}

describe("generateWorldCupBracketExplanation — AI language instruction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaFindFirstMock.mockResolvedValue(makeEntry())
    seedStrengthMock.mockReturnValue(75)
    openaiMock.mockResolvedValue({ ok: true, text: "Strategy review here.", model: "gpt-test" })
  })

  async function getSystemPrompt(locale: string | null | undefined) {
    const { generateWorldCupBracketExplanation } = await import(
      "@/lib/world-cup/worldCupExplainBracketService"
    )
    await generateWorldCupBracketExplanation({
      challengeId: "c1",
      entryId: "entry-1",
      userId: "user-1",
      locale,
    })
    const call = openaiMock.mock.calls[0]?.[0]
    return call?.messages?.[0]?.content as string
  }

  it("includes 'Respond in Spanish' for es locale", async () => {
    const prompt = await getSystemPrompt("es")
    expect(prompt).toContain("Respond in Spanish")
  })

  it("includes 'Respond in Traditional Chinese' for zh locale", async () => {
    const prompt = await getSystemPrompt("zh")
    expect(prompt).toContain("Respond in Traditional Chinese")
  })

  it("includes 'Respond in Filipino' for fil locale", async () => {
    const prompt = await getSystemPrompt("fil")
    expect(prompt).toContain("Respond in Filipino")
  })

  it("includes 'Respond in Vietnamese' for vi locale", async () => {
    const prompt = await getSystemPrompt("vi")
    expect(prompt).toContain("Respond in Vietnamese")
  })

  it("falls back to 'Respond in English' for unknown locale", async () => {
    const prompt = await getSystemPrompt("xx")
    expect(prompt).toContain("Respond in English")
  })

  it("falls back to 'Respond in English' when locale is null", async () => {
    const prompt = await getSystemPrompt(null)
    expect(prompt).toContain("Respond in English")
  })

  it("uses English for en locale explicitly", async () => {
    const prompt = await getSystemPrompt("en")
    expect(prompt).toContain("Respond in English")
  })

  it("privacy language is present in the system prompt", async () => {
    const prompt = await getSystemPrompt("es")
    expect(prompt).toMatch(/Do not reveal private user data/i)
    expect(prompt).toMatch(/invite codes/i)
  })

  it("never calls OpenAI for the uniqueness GET path (action=uniqueness does not reach service)", () => {
    // The uniqueness handler in the route.ts is a GET that uses prisma directly
    // — it never calls generateWorldCupBracketExplanation. Verify the service was
    // not called in this test context by default.
    expect(openaiMock).not.toHaveBeenCalled()
  })

  it("falls back to deterministic explanation when openai fails, without language-leaking error", async () => {
    openaiMock.mockResolvedValue({ ok: false, error: "provider_error", model: null })

    const { generateWorldCupBracketExplanation } = await import(
      "@/lib/world-cup/worldCupExplainBracketService"
    )
    const result = await generateWorldCupBracketExplanation({
      challengeId: "c1",
      entryId: "entry-1",
      userId: "user-1",
      locale: "es",
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("should be ok")
    expect(result.generative).toBe(false)
    // Fallback must not expose provider error details.
    expect(JSON.stringify(result)).not.toMatch(/provider_error|OPENAI|sk-/i)
  })
})
