import { describe, expect, it } from "vitest"
import { classifyChimmyIntent } from "@/lib/chimmy-context/intent/IntentClassifier"
import { selectProvidersForIntent } from "@/lib/chimmy-context/intent/ProviderSelector"
import {
  intentToToolId,
  resolveToolLaunches,
} from "@/lib/chimmy-orchestration/tool-routing-map"

describe("Chimmy Sports OS intent routing", () => {
  it("routes commissioner requests to commissioner context and tool launch", () => {
    const classified = classifyChimmyIntent({
      message: "Generate a league health report and weekly commissioner announcement",
    })

    expect(classified.intent).toBe("commissioner")
    expect(selectProvidersForIntent(classified.intent)).toContain("leagueDifficulty")
    expect(intentToToolId("commissioner")).toBe("commissioner_report")
    expect(resolveToolLaunches("commissioner", { leagueId: "league-1", sport: "NFL" }).primary?.href)
      .toContain("tab=commissioner")
  })

  it("routes bracket, injury, and weather requests away from generic chat", () => {
    expect(classifyChimmyIntent({ message: "Which bracket picks are risky in my World Cup pool?" }).intent)
      .toBe("bracket")
    expect(classifyChimmyIntent({ message: "Which injuries affect my roster?" }).intent)
      .toBe("injury")
    expect(classifyChimmyIntent({ message: "Any weather risk in my games this week?" }).intent)
      .toBe("weather")

    expect(intentToToolId("bracket")).toBe("bracket_intelligence")
    expect(intentToToolId("injury")).toBe("injury_report")
    expect(intentToToolId("weather")).toBe("weather_engine")
  })
})
