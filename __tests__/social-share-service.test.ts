import { describe, expect, it } from "vitest"
import {
  getAchievementSharePayload,
  getAchievementShareUrl,
  getFacebookShareUrl,
  getRedditShareUrl,
  getTwitterShareUrl,
} from "@/lib/social-sharing/SocialShareService"

describe("SocialShareService", () => {
  it("builds canonical achievement share URL with query context", () => {
    const shareUrl = getAchievementShareUrl(
      "winning_matchup",
      {
        leagueName: "Alpha League",
        leagueId: "league-1",
        opponentName: "Rivals",
        week: 7,
        teamName: "Alpha Squad",
      },
      "https://allfantasy.test"
    )

    expect(shareUrl).toContain("https://allfantasy.test/share/achievements?")
    expect(shareUrl).toContain("type=winning_matchup")
    expect(shareUrl).toContain("league=Alpha+League")
    expect(shareUrl).toContain("leagueId=league-1")
    expect(shareUrl).toContain("opponent=Rivals")
    expect(shareUrl).toContain("week=7")
    expect(shareUrl).toContain("team=Alpha+Squad")
  })

  it("creates network links for X, Facebook, and Reddit", () => {
    const shareUrl = "https://allfantasy.ai/share/achievements?type=winning_league"
    const twitter = getTwitterShareUrl(shareUrl, "League champion in Alpha League!")
    const facebook = getFacebookShareUrl(shareUrl)
    const reddit = getRedditShareUrl(shareUrl, "League champion in Alpha League!")

    expect(twitter).toContain("twitter.com/intent/tweet")
    expect(twitter).toContain(encodeURIComponent(shareUrl))
    expect(facebook).toContain("facebook.com/sharer/sharer.php")
    expect(facebook).toContain(encodeURIComponent(shareUrl))
    expect(reddit).toContain("reddit.com/submit")
    expect(reddit).toContain(encodeURIComponent(shareUrl))
  })

  it("returns payload with all network URLs for sharing", () => {
    const payload = getAchievementSharePayload("high_scoring_team", {
      leagueName: "Points League",
      teamName: "Boom Team",
      score: 190.4,
      week: 10,
    })

    expect(payload.shareUrl).toContain("/share/achievements?type=high_scoring_team")
    expect(payload.twitterUrl).toContain("twitter.com/intent/tweet")
    expect(payload.facebookUrl).toContain("facebook.com/sharer/sharer.php")
    expect(payload.redditUrl).toContain("reddit.com/submit")
    expect(payload.title.length).toBeGreaterThan(0)
    expect(payload.text.length).toBeGreaterThan(0)
  })
})
