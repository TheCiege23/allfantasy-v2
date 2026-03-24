import { describe, expect, it } from "vitest"
import {
  getCreatePollPayload,
  getMentionRanges,
  hasMentions,
  parseMentions,
  parsePollBody,
} from "@/lib/social-chat"

describe("social chat services", () => {
  it("parses mentions and resolves ranges consistently", () => {
    const text = "Hey @alex and @jordan, check this out @alex"
    expect(parseMentions(text)).toEqual(["alex", "jordan"])
    expect(getMentionRanges(text).map((range) => range.username)).toEqual(["alex", "jordan", "alex"])
    expect(hasMentions(text)).toBe(true)
    expect(hasMentions(text)).toBe(true)
  })

  it("normalizes create poll payload and parses closed state", () => {
    const payload = getCreatePollPayload(
      "  Week 7 starter?  ",
      ["  Team A ", "", "Team B", "Team C"]
    )
    expect(payload).toEqual({
      question: "Week 7 starter?",
      options: ["Team A", "Team B", "Team C"],
    })

    const parsed = parsePollBody(
      JSON.stringify({
        question: "Week 7 starter?",
        options: ["Team A", "Team B", "Team C"],
        votes: { "0": ["u1"] },
        closed: true,
      })
    )
    expect(parsed?.closed).toBe(true)
    expect(parsed?.votes?.["0"]).toEqual(["u1"])
  })
})
