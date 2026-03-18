export type DashboardRuntimeIssue = {
  title: string
  message: string
  missing: string[]
}

const DASHBOARD_TITLE = "Dashboard temporarily unavailable"

const KNOWN_CONFIG_ERRORS = [
  { env: "DATABASE_URL", pattern: "DATABASE_URL is not set" },
  { env: "NEXTAUTH_SECRET", pattern: "NEXTAUTH_SECRET is not set" },
] as const

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

export function getDashboardMissingEnvVars(
  env: Partial<Record<"DATABASE_URL" | "NEXTAUTH_SECRET", string | undefined>> = process.env
): string[] {
  const missing: string[] = []

  if (!env.DATABASE_URL?.trim()) missing.push("DATABASE_URL")
  if (!env.NEXTAUTH_SECRET?.trim()) missing.push("NEXTAUTH_SECRET")

  return missing
}

export function createDashboardRuntimeIssue(missing: string[]): DashboardRuntimeIssue {
  const uniqueMissing = unique(missing)

  if (uniqueMissing.length === 1 && uniqueMissing[0] === "DATABASE_URL") {
    return {
      title: DASHBOARD_TITLE,
      message:
        "The dashboard can't load because this deployment is missing its database connection setting.",
      missing: uniqueMissing,
    }
  }

  if (uniqueMissing.length === 1 && uniqueMissing[0] === "NEXTAUTH_SECRET") {
    return {
      title: DASHBOARD_TITLE,
      message:
        "The dashboard can't load because sign-in is not fully configured for this deployment.",
      missing: uniqueMissing,
    }
  }

  return {
    title: DASHBOARD_TITLE,
    message:
      "The dashboard can't load because this deployment is missing required server configuration.",
    missing: uniqueMissing,
  }
}

export function getDashboardRuntimeIssue(error: unknown): DashboardRuntimeIssue | null {
  const message =
    typeof error === "string" ? error : error instanceof Error ? error.message : ""

  if (!message) return null

  const missing = KNOWN_CONFIG_ERRORS.filter(({ pattern }) => message.includes(pattern)).map(
    ({ env }) => env
  )

  if (missing.length === 0) {
    return null
  }

  return createDashboardRuntimeIssue(missing)
}
