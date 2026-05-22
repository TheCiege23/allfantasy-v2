import { describe, expect, it } from "vitest"

import { classifyChimmyIntent } from "@/lib/chimmy-context/intent/IntentClassifier"

describe("classifyChimmyIntent", () => {
  it("returns general for empty input", () => {
    expect(classifyChimmyIntent({ message: "" }).intent).toBe("general")
  })

  it("returns general for unrelated chat", () => {
    expect(classifyChimmyIntent({ message: "hello there" }).intent).toBe("general")
  })

  it("classifies start/sit questions", () => {
    expect(
      classifyChimmyIntent({ message: "Who should I start at flex this week?" }).intent
    ).toBe("start_sit")
    expect(
      classifyChimmyIntent({ message: "Start or sit Najee Harris?" }).intent
    ).toBe("start_sit")
  })

  it("classifies trade questions", () => {
    expect(
      classifyChimmyIntent({ message: "Should I accept this trade offer?" }).intent
    ).toBe("trade")
    expect(
      classifyChimmyIntent({ message: "Looking for a buy-low candidate" }).intent
    ).toBe("trade")
  })

  it("classifies waiver questions", () => {
    expect(
      classifyChimmyIntent({ message: "Top waiver wire pickup this week?" }).intent
    ).toBe("waiver")
    expect(
      classifyChimmyIntent({ message: "How much FAAB should I bid?" }).intent
    ).toBe("waiver")
  })

  it("classifies dynasty questions", () => {
    expect(
      classifyChimmyIntent({ message: "Should I rebuild or contend?" }).intent
    ).toBe("dynasty")
    expect(
      classifyChimmyIntent({ message: "What's the value of a future 1st round pick?" })
        .intent
    ).toBe("dynasty")
  })

  it("classifies rankings questions", () => {
    expect(
      classifyChimmyIntent({ message: "Show me your tier rankings" }).intent
    ).toBe("rankings")
  })

  it("classifies matchup questions", () => {
    expect(
      classifyChimmyIntent({ message: "Tell me about my matchup this week" }).intent
    ).toBe("matchup")
  })

  it("classifies draft questions", () => {
    expect(
      classifyChimmyIntent({ message: "Best draft strategy from pick 5?" }).intent
    ).toBe("draft")
  })

  it("includes matched terms", () => {
    const r = classifyChimmyIntent({ message: "should I trade my RB1?" })
    expect(r.intent).toBe("trade")
    expect(r.matchedTerms.length).toBeGreaterThan(0)
  })

  it("uses history tail when message is ambiguous", () => {
    const r = classifyChimmyIntent({
      message: "What about him?",
      history: [
        { role: "user", content: "Should I start my flex?" },
        { role: "assistant", content: "Sure, I can help with lineup decisions." },
      ],
    })
    expect(r.intent).toBe("start_sit")
  })

  it("confidence is in [0,1]", () => {
    const r = classifyChimmyIntent({
      message: "trade waiver dynasty rankings matchup draft start sit lineup",
    })
    expect(r.confidence).toBeGreaterThanOrEqual(0)
    expect(r.confidence).toBeLessThanOrEqual(1)
  })
})
