import { describe, expect, it } from "vitest"
import {
  getLeagueMentionRanges,
  getLeaguePollCloseUrl,
  getLeaguePollVoteUrl,
  getLeagueSystemNoticeLabel,
  getSystemNoticeBody,
  getTradeAcceptedNoticePayload,
  getWaiverNoticePayload,
  isLeagueSystemNotice,
  parseLeaguePollPayload,
} from "@/lib/league-chat"

describe("league chat services", () => {
  it("resolves extended system notice types", () => {
    expect(isLeagueSystemNotice("waiver_bot")).toBe(true)
    expect(isLeagueSystemNotice("commissioner_notice")).toBe(true)
    expect(isLeagueSystemNotice("trade_notice")).toBe(true)
    expect(getLeagueSystemNoticeLabel("trade_accepted")).toBe("Trade")
    expect(getLeagueSystemNoticeLabel("waiver_notice")).toBe("Waiver")
    expect(getLeagueSystemNoticeLabel("commissioner_notice")).toBe("Commissioner")
  })

  it("parses system notice and mention ranges", () => {
    expect(getSystemNoticeBody(JSON.stringify({ text: "Trade completed" }))).toBe("Trade completed")
    expect(getSystemNoticeBody("Plain text notice")).toBe("Plain text notice")
    const ranges = getLeagueMentionRanges("Hey @alex and @jordan")
    expect(ranges).toEqual([
      { start: 4, end: 9, username: "alex" },
      { start: 14, end: 21, username: "jordan" },
    ])
  })

  it("parses poll payload from metadata or JSON body", () => {
    const fromMetadata = parseLeaguePollPayload({
      body: "",
      metadata: { question: "Who wins?", options: ["A", "B"], votes: { "0": ["u1"] } },
    })
    expect(fromMetadata).toMatchObject({
      question: "Who wins?",
      options: ["A", "B"],
      votes: { "0": ["u1"] },
    })

    const fromBody = parseLeaguePollPayload({
      body: JSON.stringify({ question: "Start?", options: ["Yes", "No"], closed: true }),
    })
    expect(fromBody).toMatchObject({
      question: "Start?",
      options: ["Yes", "No"],
      closed: true,
    })
  })

  it("builds bridge payload helpers and poll urls", () => {
    const trade = getTradeAcceptedNoticePayload({
      acceptedByName: "Alex",
      teamsSummary: "Team A <-> Team B",
      actionHref: "/trade-history",
    })
    expect(trade).toMatchObject({
      messageType: "trade_accepted",
      metadata: { actionHref: "/trade-history" },
    })

    const waiver = getWaiverNoticePayload({ summary: "Waivers processed" })
    expect(waiver).toMatchObject({ messageType: "waiver_notice", body: "Waivers processed" })

    expect(getLeaguePollVoteUrl("thread-1", "msg-1")).toBe(
      "/api/shared/chat/threads/thread-1/messages/msg-1/vote"
    )
    expect(getLeaguePollCloseUrl("thread-1", "msg-1")).toBe(
      "/api/shared/chat/threads/thread-1/messages/msg-1/close-poll"
    )
  })
})
