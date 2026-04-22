import type { AiOpponentsLeagueSettings } from "./types"

export function getAiOpponentsSettings(settings: unknown): AiOpponentsLeagueSettings {
  if (!settings || typeof settings !== "object") return {}
  const o = settings as Record<string, unknown>
  const ai = o.aiOpponents
  if (!ai || typeof ai !== "object") return {}
  return ai as AiOpponentsLeagueSettings
}

export function mergeAiOpponentsSettings(
  current: Record<string, unknown>,
  patch: Partial<AiOpponentsLeagueSettings>
): Record<string, unknown> {
  const prev = getAiOpponentsSettings(current)
  return {
    ...current,
    aiOpponents: { ...prev, ...patch },
  }
}
