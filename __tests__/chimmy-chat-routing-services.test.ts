import { describe, expect, it } from "vitest"
import { buildAIChatHref, readAIContextFromSearchParams } from "@/lib/chimmy-chat"
import { getTradeAnalyzerAIChatUrl } from "@/lib/trade-analyzer/TradeToAIContextBridge"
import { getWaiverAIChatUrl } from "@/lib/waiver-wire/WaiverToAIContextBridge"
import { getDraftAIChatUrl } from "@/lib/draft-room/DraftToAIContextBridge"
import { getMatchupAIChatUrl } from "@/lib/matchup-simulator/SimulatorToAIContextBridge"

describe("chimmy chat routing services", () => {
  it("builds private messaging AI href with preserved context", () => {
    const href = buildAIChatHref({
      prompt: "Explain this trade",
      leagueId: "league-1",
      insightType: "trade",
      teamId: "team-7",
      sport: "NBA",
      season: 2026,
      week: 3,
      source: "trade_analyzer",
    })

    expect(href).toContain("/messages?tab=ai")
    expect(href).toContain("prompt=Explain+this+trade")
    expect(href).toContain("leagueId=league-1")
    expect(href).toContain("insightType=trade")
    expect(href).toContain("sport=NBA")
    expect(href).toContain("source=trade_analyzer")
  })

  it("reads context from search params and normalizes sport fallback", () => {
    const params = new URLSearchParams("tab=ai&prompt=hello&sport=unsupported&insightType=waiver")
    const context = readAIContextFromSearchParams(params)

    expect(context.prompt).toBe("hello")
    expect(context.insightType).toBe("waiver")
    expect(context.sport).toBe("NFL")
  })

  it("routes tool bridges into messages AI chat", () => {
    const trade = getTradeAnalyzerAIChatUrl("Trade check", { insightType: "trade", sport: "NFL" })
    const waiver = getWaiverAIChatUrl("Waiver help", { insightType: "waiver", sport: "NHL" })
    const draft = getDraftAIChatUrl("Draft help", { insightType: "draft", sport: "MLB" })
    const matchup = getMatchupAIChatUrl("Matchup help", { insightType: "matchup", sport: "SOCCER" })

    for (const href of [trade, waiver, draft, matchup]) {
      expect(href.startsWith("/messages?tab=ai")).toBe(true)
    }
    expect(trade).toContain("source=trade_analyzer")
    expect(waiver).toContain("source=waiver_tool")
    expect(draft).toContain("source=draft_tool")
    expect(matchup).toContain("source=matchup_tool")
  })
})
