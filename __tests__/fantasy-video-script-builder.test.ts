import { describe, expect, it } from "vitest"
import { buildFantasyVideoScript } from "@/lib/fantasy-media/FantasyVideoScriptBuilder"

describe("FantasyVideoScriptBuilder", () => {
  it("builds structured fantasy script with required sections", () => {
    const result = buildFantasyVideoScript({
      sport: "soccer",
      leagueName: "Premier Fantasy League",
      week: 6,
      contentType: "weekly_recap",
    })

    expect(result.sport).toBe("SOCCER")
    expect(result.title).toContain("Week 6")
    expect(result.sections.map((s) => s.heading)).toEqual([
      "Intro",
      "Key storylines",
      "Top performers",
      "Waiver targets",
      "Trending players",
      "League drama and rivalry watch",
      "Closing CTA",
    ])
    expect(result.script).toContain("Premier Fantasy League")
  })

  it("supports sport-specific content type", () => {
    const result = buildFantasyVideoScript({
      sport: "NBA",
      contentType: "sport_specific_content",
      leagueName: "Dynasty Hoops",
    })
    expect(result.contentType).toBe("sport_specific_content")
    expect(result.title).toContain("Sport-specific fantasy spotlight")
    expect(result.script).toContain("Dynasty Hoops")
  })
})
