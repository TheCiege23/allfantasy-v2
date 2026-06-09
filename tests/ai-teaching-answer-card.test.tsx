/**
 * TeachingAnswerCard component tests (Suite F)
 *
 * 21.  Renders quickAnswer, whyItMatters, theEdge
 * 22.  Renders AVOID section when mistakeToAvoid present
 * 23.  Does not render AVOID section when mistakeToAvoid absent
 * 24.  Confidence pill shows correct percentage
 * 25.  Feedback buttons fire onFeedback callback
 * 26.  No feedback buttons when onFeedback not provided
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"

// Clear DOM and call counts between tests.
beforeEach(() => {
  cleanup()
  vi.clearAllMocks()
})

import type { TeachingAnswer } from "@/lib/ai/teachingAnswer"
import { TeachingAnswerCard } from "@/components/ai/TeachingAnswerCard"

const sampleAnswer: TeachingAnswer = {
  quickAnswer: "France wins this pool for you.",
  whyItMatters: "Three of four entries above you picked Germany.",
  theEdge: "Root for the result that hurts your rivals, not your favorites.",
  mistakeToAvoid: "Do not pick based on emotion — pick based on leaderboard math.",
  confidence: 0.85,
  dataUsed: ["pool standings", "pick distribution"],
}

describe("TeachingAnswerCard", () => {
  it("21. renders quickAnswer, whyItMatters, theEdge", () => {
    render(<TeachingAnswerCard answer={sampleAnswer} />)
    expect(screen.getByTestId("teaching-quick-answer")).toBeTruthy()
    expect(screen.getByText(/Three of four entries/)).toBeTruthy()
    expect(screen.getByText(/root for the result/i)).toBeTruthy()
  })

  it("22. renders AVOID section when mistakeToAvoid present", () => {
    render(<TeachingAnswerCard answer={sampleAnswer} />)
    expect(screen.getByText(/pick based on leaderboard math/i)).toBeTruthy()
    expect(screen.getByText(/Mistake To Avoid/i)).toBeTruthy()
  })

  it("23. does not render AVOID section when mistakeToAvoid absent", () => {
    const noAvoid = { ...sampleAnswer, mistakeToAvoid: undefined }
    render(<TeachingAnswerCard answer={noAvoid} />)
    expect(screen.queryByText(/Mistake To Avoid/i)).toBeNull()
  })

  it("24. confidence pill shows correct percentage", () => {
    render(<TeachingAnswerCard answer={sampleAnswer} />)
    // ConfidencePill renders "85% confident" inside the span
    expect(screen.getByText(/85%/)).toBeTruthy()
  })

  it("25. feedback buttons fire onFeedback callback", () => {
    const onFeedback = vi.fn()
    render(<TeachingAnswerCard answer={sampleAnswer} onFeedback={onFeedback} />)
    fireEvent.click(screen.getByTestId("teaching-feedback-helpful"))
    expect(onFeedback).toHaveBeenCalledWith("helpful")
    fireEvent.click(screen.getByTestId("teaching-feedback-not-helpful"))
    expect(onFeedback).toHaveBeenCalledWith("not_helpful")
  })

  it("26. no feedback buttons when onFeedback not provided", () => {
    render(<TeachingAnswerCard answer={sampleAnswer} />)
    expect(screen.queryByTestId("teaching-feedback-helpful")).toBeNull()
    expect(screen.queryByTestId("teaching-feedback-not-helpful")).toBeNull()
  })
})
