import { describe, expect, it } from "vitest"
import { generateFantasyPodcastScript } from "@/lib/podcast-engine/FantasyPodcastGenerator"
import { DEFAULT_SPORT } from "@/lib/sport-scope"

describe("FantasyPodcastGenerator", () => {
  it("builds weekly sections for supported sport context", () => {
    const result = generateFantasyPodcastScript({
      leagueName: "Dynasty Builders",
      sport: "soccer",
      weekLabel: "Week 11",
    })

    expect(result.title).toContain("Dynasty Builders")
    expect(result.title).toContain("Week 11")
    expect(result.sections).toHaveLength(3)
    expect(result.sections[0]?.heading).toBe("League recap")
    expect(result.sections[1]?.heading).toBe("Top waiver targets")
    expect(result.sections[2]?.heading).toBe("Player performance summary")
    expect(result.sections[2]?.body).toContain("SOCCER")
  })

  it("falls back to default supported sport when unknown", () => {
    const result = generateFantasyPodcastScript({ sport: "cricket" })
    expect(result.sections[2]?.body).toContain(DEFAULT_SPORT)
  })
})
