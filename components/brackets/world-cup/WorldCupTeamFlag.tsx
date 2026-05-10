"use client"

import { useEffect, useMemo, useState } from "react"
import { Globe2 } from "lucide-react"

const TEAM_CODE_BY_NAME: Record<string, string> = {
  argentina: "ARG",
  australia: "AUS",
  belgium: "BEL",
  brazil: "BRA",
  canada: "CAN",
  colombia: "COL",
  croatia: "CRO",
  denmark: "DEN",
  ecuador: "ECU",
  england: "ENG",
  france: "FRA",
  germany: "GER",
  ghana: "GHA",
  iran: "IRN",
  japan: "JPN",
  mexico: "MEX",
  morocco: "MAR",
  netherlands: "NED",
  new_zealand: "NZL",
  "new zealand": "NZL",
  nigeria: "NGA",
  paraguay: "PAR",
  portugal: "POR",
  "saudi arabia": "KSA",
  senegal: "SEN",
  "south africa": "RSA",
  "south korea": "KOR",
  spain: "ESP",
  sweden: "SWE",
  switzerland: "SUI",
  tunisia: "TUN",
  uruguay: "URU",
  usa: "USA",
  "united states": "USA",
}

const FIFA_TO_ISO2: Record<string, string> = {
  ARG: "AR",
  AUS: "AU",
  BEL: "BE",
  BRA: "BR",
  CAN: "CA",
  COL: "CO",
  CRO: "HR",
  DEN: "DK",
  ECU: "EC",
  ENG: "GB",
  ESP: "ES",
  FRA: "FR",
  GER: "DE",
  GHA: "GH",
  IRN: "IR",
  JPN: "JP",
  KOR: "KR",
  KSA: "SA",
  MAR: "MA",
  MEX: "MX",
  NED: "NL",
  NGA: "NG",
  NZL: "NZ",
  PAR: "PY",
  POR: "PT",
  RSA: "ZA",
  SEN: "SN",
  SUI: "CH",
  SWE: "SE",
  TUN: "TN",
  URU: "UY",
  USA: "US",
}

const SIZE_CLASS = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-7 w-7 text-[10px]",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-xl sm:h-14 sm:w-14 sm:text-lg",
}

function isImageUrl(value?: string | null): value is string {
  return Boolean(value && (/^https?:\/\//i.test(value) || value.startsWith("/")))
}

function normalizeCode(value?: string | null): string | null {
  const code = value?.trim().toUpperCase().replace(/[^A-Z]/g, "")
  if (!code || code.length < 2 || code.length > 3) return null
  return code
}

function countryCodeFromName(teamName?: string | null): string | null {
  const key = teamName?.trim().toLowerCase()
  if (!key || key === "tbd") return null
  return TEAM_CODE_BY_NAME[key] ?? null
}

function flagCodeFromUrl(value?: string | null): string | null {
  if (!value) return null
  const match = value.toLowerCase().match(/\/([a-z]{2})(?:\.png|\.svg|\.jpg|\.webp)(?:\?|$)/)
  return match?.[1]?.toUpperCase() ?? null
}

function emojiFromIso2(value?: string | null): string | null {
  const code = normalizeCode(value)
  if (!code || code.length !== 2) return null
  const base = 127397
  return String.fromCodePoint(...code.split("").map((char) => base + char.charCodeAt(0)))
}

function emojiFromCode(value?: string | null): string | null {
  const code = normalizeCode(value)
  if (!code) return null
  return emojiFromIso2(code.length === 2 ? code : FIFA_TO_ISO2[code])
}

function emojiFromStoredValue(value?: string | null): string | null {
  const raw = value?.trim()
  if (!raw || isImageUrl(raw)) return null
  return /[^\u0000-\u007f]/.test(raw) ? raw : null
}

export default function WorldCupTeamFlag({
  flagUrl,
  teamName,
  countryCode,
  emoji,
  size = "sm",
  className = "",
  testId,
}: {
  flagUrl?: string | null
  teamName?: string | null
  countryCode?: string | null
  emoji?: string | null
  size?: keyof typeof SIZE_CLASS
  className?: string
  testId?: string
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const label = teamName?.trim() || countryCode?.trim() || "Team"
  const imageSrc = isImageUrl(flagUrl) ? flagUrl : null

  useEffect(() => {
    setImageFailed(false)
  }, [imageSrc])

  const inferredCode = useMemo(
    () =>
      normalizeCode(countryCode) ??
      normalizeCode(!isImageUrl(flagUrl) ? flagUrl : null) ??
      countryCodeFromName(teamName) ??
      normalizeCode(flagCodeFromUrl(flagUrl)),
    [countryCode, flagUrl, teamName]
  )
  const fallbackEmoji = useMemo(
    () => emoji || emojiFromStoredValue(flagUrl) || (imageFailed ? emojiFromCode(flagCodeFromUrl(flagUrl) ?? inferredCode) : null),
    [emoji, flagUrl, imageFailed, inferredCode]
  )
  const baseClass = `inline-flex shrink-0 items-center justify-center rounded-full bg-white/10 ${SIZE_CLASS[size]} ${className}`

  if (imageSrc && !imageFailed) {
    return (
      <img
        src={imageSrc}
        alt={`${label} flag`}
        data-testid={testId ?? "world-cup-team-flag-image"}
        onError={() => setImageFailed(true)}
        className={`${baseClass} bg-white object-contain p-0.5`}
      />
    )
  }

  if (fallbackEmoji) {
    return (
      <span
        role="img"
        aria-label={`${label} flag`}
        data-testid={testId ?? "world-cup-team-flag-emoji"}
        className={baseClass}
      >
        {fallbackEmoji}
      </span>
    )
  }

  if (inferredCode) {
    return (
      <span
        aria-label={`${label} country code ${inferredCode}`}
        data-testid={testId ?? "world-cup-team-flag-code"}
        className={`${baseClass} font-black text-white/70`}
      >
        {inferredCode}
      </span>
    )
  }

  return (
    <span
      role="img"
      aria-label={`${label} flag unavailable`}
      data-testid={testId ?? "world-cup-team-flag-globe"}
      className={`${baseClass} text-white/55`}
    >
      <Globe2 className="h-1/2 w-1/2" aria-hidden />
    </span>
  )
}
