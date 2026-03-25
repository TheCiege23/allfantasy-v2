import { describe, expect, it } from "vitest"
import { formatShareText, getShareContent } from "@/lib/social-sharing/AchievementShareGenerator"

describe("AchievementShareGenerator", () => {
  it("generates winning matchup share content", () => {
    const content = getShareContent("winning_matchup", {
      leagueName: "Alpha League",
      opponentName: "Rivals",
      week: 8,
      score: 151.2,
    })

    expect(content.title).toContain("won my matchup")
    expect(content.text).toContain("Week 8")
    expect(content.text).toContain("Rivals")
    expect(content.hashtags).toContain("FantasyWin")
  })

  it("generates winning league share content", () => {
    const content = getShareContent("winning_league", {
      leagueName: "Champions League",
      teamName: "Stacked Squad",
    })

    expect(content.title).toContain("League champion")
    expect(content.text).toContain("Stacked Squad")
    expect(content.hashtags).toContain("LeagueChampion")
  })

  it("generates high scoring team share content", () => {
    const content = getShareContent("high_scoring_team", {
      leagueName: "Points League",
      teamName: "Boom Team",
      score: 181.7,
      week: 12,
    })

    expect(content.title).toContain("High score")
    expect(content.text).toContain("181.7")
    expect(content.text).toContain("Week 12")
    expect(content.hashtags).toContain("HighScore")
  })

  it("formats share text with hashtags", () => {
    const content = getShareContent("winning_league", {
      leagueName: "Champions League",
      teamName: "Stacked Squad",
    })
    const text = formatShareText(content)
    expect(text).toContain("#AllFantasy")
    expect(text).toContain("#FantasyFootball")
  })
})
