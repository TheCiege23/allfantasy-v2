// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import PodcastPlayerClient from "@/components/podcast/PodcastPlayerClient"

describe("PodcastPlayerClient click actions", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.restoreAllMocks()
  })

  it("toggles play and pause button state", async () => {
    const playMock = vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue()
    const pauseMock = vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => {})

    await act(async () => {
      root.render(
        createElement(PodcastPlayerClient, {
          episodeId: "ep-1",
          title: "Episode One",
          script: "Recap text",
          playbackUrl: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=",
          durationSeconds: 120,
        })
      )
    })

    const playButton = container.querySelector('[data-testid="podcast-play-button"]') as HTMLButtonElement | null
    expect(playButton).not.toBeNull()
    expect(playButton?.getAttribute("aria-label")).toBe("Play podcast")

    await act(async () => {
      playButton?.click()
    })
    expect(playMock).toHaveBeenCalledTimes(1)
    expect(playButton?.getAttribute("aria-label")).toBe("Pause podcast")

    await act(async () => {
      playButton?.click()
    })
    expect(pauseMock).toHaveBeenCalledTimes(1)
    expect(playButton?.getAttribute("aria-label")).toBe("Play podcast")
  })

  it("shares podcast URL and shows success state", async () => {
    const shareMock = vi.fn(async () => {})
    ;(navigator as any).canShare = vi.fn(() => true)
    ;(navigator as any).share = shareMock

    await act(async () => {
      root.render(
        createElement(PodcastPlayerClient, {
          episodeId: "ep-2",
          title: "Episode Two",
          script: "Weekly recap",
          playbackUrl: null,
          durationSeconds: 90,
        })
      )
    })

    const shareButton = container.querySelector('[data-testid="podcast-share-button"]') as HTMLButtonElement | null
    expect(shareButton).not.toBeNull()

    await act(async () => {
      shareButton?.click()
    })

    expect(shareMock).toHaveBeenCalledTimes(1)
    const payload = shareMock.mock.calls[0]?.[0] as { url?: string }
    expect(payload.url).toContain("/podcast/ep-2")
    expect(shareButton?.textContent).toContain("Copied!")
    const success = container.querySelector('[data-testid="podcast-share-success"]')
    expect(success).not.toBeNull()
  })
})
