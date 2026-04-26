export type ChimmyFeatureFlags = {
  intentChips: boolean
  assistantModes: boolean
  followups: boolean
  trustPanel: boolean
  dailyDigest: boolean
  voicePreview: boolean
  aiKpiEvents: boolean
}

const DEFAULT_FLAGS: ChimmyFeatureFlags = {
  intentChips: true,
  assistantModes: true,
  followups: true,
  trustPanel: true,
  dailyDigest: false,
  voicePreview: false,
  aiKpiEvents: true,
}

function parseBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (!raw) return fallback
  const normalized = raw.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

function readFlagValue(envKey: string, fallback: boolean): boolean {
  const raw = process.env[envKey] ?? process.env[`NEXT_PUBLIC_${envKey}`]
  return parseBoolean(raw, fallback)
}

export function getChimmyFeatureFlags(): ChimmyFeatureFlags {
  return {
    intentChips: readFlagValue('CHIMMY_INTENT_CHIPS_ENABLED', DEFAULT_FLAGS.intentChips),
    assistantModes: readFlagValue('CHIMMY_ASSISTANT_MODES_ENABLED', DEFAULT_FLAGS.assistantModes),
    followups: readFlagValue('CHIMMY_FOLLOWUPS_ENABLED', DEFAULT_FLAGS.followups),
    trustPanel: readFlagValue('CHIMMY_TRUST_PANEL_ENABLED', DEFAULT_FLAGS.trustPanel),
    dailyDigest: readFlagValue('CHIMMY_DAILY_DIGEST_ENABLED', DEFAULT_FLAGS.dailyDigest),
    voicePreview: readFlagValue('CHIMMY_VOICE_PREVIEW_ENABLED', DEFAULT_FLAGS.voicePreview),
    aiKpiEvents: readFlagValue('CHIMMY_AI_KPI_EVENTS_ENABLED', DEFAULT_FLAGS.aiKpiEvents),
  }
}
