import { describe, expect, it } from "vitest"
import { getClipPayload } from "@/lib/social-clips/SocialClipGenerator"

describe("SocialClipGenerator", () => {
  it("generates weekly league winners payload with defaults", () => {
    const payload = getClipPayload("weekly_league_winners", {
      leagueName: "AllFantasy Elite",
      week: 5,
    })

    expect(payload.title).toBe("Weekly League Winners")
    expect(payload.subtitle).toBe("Champions of the week")
    expect(payload.stats).toEqual(["AllFantasy Elite · Week 5", "Crowned this week"])
  })

  it("generates biggest upset payload with defaults", () => {
    const payload = getClipPayload("biggest_upset", {
      leagueName: "Upset League",
      week: 8,
    })

    expect(payload.title).toBe("Biggest Upset")
    expect(payload.subtitle).toBe("The underdog prevails")
    expect(payload.stats).toEqual(["Upset League · Week 8", "Underdog victory"])
  })

  it("generates top scoring team payload with defaults", () => {
    const payload = getClipPayload("top_scoring_team", {
      leagueName: "Points League",
      week: 9,
    })

    expect(payload.title).toBe("Top Scoring Team")
    expect(payload.subtitle).toBe("Highest score this week")
    expect(payload.stats).toEqual(["Points League · Week 9", "Highest points"])
  })

  it("respects custom title, subtitle, and stats overrides", () => {
    const payload = getClipPayload("weekly_league_winners", {
      title: "Custom Winners",
      subtitle: "Custom subtitle",
      stats: ["Stat 1", "Stat 2"],
      leagueName: "Custom League",
      week: 3,
    })

    expect(payload.title).toBe("Custom Winners")
    expect(payload.subtitle).toBe("Custom subtitle")
    expect(payload.stats).toEqual(["Stat 1", "Stat 2"])
    expect(payload.meta?.leagueName).toBe("Custom League")
    expect(payload.meta?.week).toBe(3)
  })
})
