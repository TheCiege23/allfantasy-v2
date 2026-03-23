import {
  AVATAR_PRESETS,
  DEFAULT_AVATAR_PRESET,
  type AvatarPresetId,
} from "@/lib/signup/avatar-presets"

const AVATAR_PRESET_SET = new Set<string>(AVATAR_PRESETS)
const MAX_AVATAR_UPLOAD_BYTES = 2 * 1024 * 1024

export function resolveAvatarPreset(value: unknown): AvatarPresetId {
  if (typeof value === "string" && AVATAR_PRESET_SET.has(value)) {
    return value as AvatarPresetId
  }
  return DEFAULT_AVATAR_PRESET
}

export function validateAvatarUploadFile(file: File | null): string | null {
  if (!file) return null
  if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
    return "Max file size is 2MB."
  }
  if (!file.type.startsWith("image/")) {
    return "Please upload an image file."
  }
  return null
}
