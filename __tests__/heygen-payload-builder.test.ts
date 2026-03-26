import { describe, expect, it } from "vitest"
import {
  buildHeyGenPayload,
  buildHeyGenPayloadMetadata,
} from "@/lib/fantasy-media/HeyGenPayloadBuilder"

describe("HeyGenPayloadBuilder", () => {
  it("builds provider payload with structured narration script", () => {
    const payload = buildHeyGenPayload({
      title: "Weekly fantasy recap",
      sport: "NCAAF",
      contentType: "weekly_recap",
      script: "Intro. Storyline. CTA.",
      sections: [
        { heading: "Intro", body: "Welcome to your recap." },
        { heading: "Key storylines", body: "Big matchup swings this week." },
      ],
      toneStyle: "analyst and hype",
      ctaEnding: "Share with your league.",
    })

    expect(payload.title).toBe("Weekly fantasy recap")
    expect(payload.voice_id.length).toBeGreaterThan(5)
    expect(payload.avatar_id).toBeTruthy()
    expect(payload.script).toContain("Sport context: NCAAF")
    expect(payload.script).toContain("Scene 1 — Intro")
    expect(payload.script).toContain("CTA ending")
  })

  it("builds payload metadata with scene and output details", () => {
    const metadata = buildHeyGenPayloadMetadata({
      title: "Playoff preview",
      sport: "NFL",
      contentType: "playoff_preview",
      script: "Playoff path analysis.",
      sections: [{ heading: "Playoff preview", body: "Three must-win matchups." }],
      language: "en",
      durationTargetSeconds: 150,
      brandingInstructions: "AllFantasy tone",
      ctaEnding: "Subscribe for next week.",
    })

    expect(metadata.videoTitle).toBe("Playoff preview")
    expect(metadata.presenterConfig.avatarId).toBeTruthy()
    expect(metadata.presenterConfig.voiceId).toBeTruthy()
    expect(metadata.sceneSections).toHaveLength(1)
    expect(metadata.outputMetadata.provider).toBe("heygen")
    expect(metadata.outputMetadata.sceneCount).toBe(1)
    expect(metadata.durationTargetSeconds).toBe(150)
  })
})
