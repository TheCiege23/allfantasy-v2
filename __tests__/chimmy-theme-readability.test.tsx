import React from "react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock("@/lib/tokens/client-confirm", () => ({
  confirmTokenSpend: vi.fn(),
}))

vi.mock("@/lib/chimmy-chat/ChimmyChatService", () => ({
  sendChimmyMessage: vi.fn(),
}))

vi.mock("@/lib/chimmy-voice", () => ({
  getVoiceConfig: () => ({ enabled: false, autoPlay: false }),
  playChimmyVoice: vi.fn(),
  saveVoiceConfig: (next: unknown) => next,
  stopCurrentVoice: vi.fn(),
}))

vi.mock("@/lib/chimmy-chat/voiceEngagementNudge", () => ({
  triggerChimmyVoiceListenNudge: vi.fn(),
}))

vi.mock("@/hooks/useChimmyAutoTradeEval", () => ({
  useChimmyAutoTradeEval: () => ({
    autoTradeEvalEnabled: false,
    toggleAutoTradeEval: vi.fn(),
    autoTradeEvalReady: true,
  }),
}))

vi.mock("@/app/dashboard/components/chat/ChimmyAssistantAvatar", () => ({
  ChimmyAssistantAvatar: () => <div data-testid="chimmy-avatar" />,
}))

describe("Chimmy dashboard readability", () => {
  beforeEach(() => {
    document.documentElement.dataset.mode = "light"
    Element.prototype.scrollIntoView = vi.fn()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ available: false }),
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.documentElement.removeAttribute("data-mode")
  })

  it("renders the dashboard Chimmy shell with mode-readable classes and visible composer controls", async () => {
    const ChimmyChat = (await import("@/app/components/ChimmyChat")).default

    render(<ChimmyChat embedded panelFill parentControlsNew />)

    const shell = screen.getByTestId("chimmy-chat-shell")
    expect(shell.className).toContain("mode-readable")
    expect(shell.className).toContain("text-white")
    expect(screen.getByText(/Hi, I'm Chimmy/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Ask about your roster/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Toggle auto trade evaluation messages/i })).toBeInTheDocument()
  })
})
