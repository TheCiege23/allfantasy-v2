import { describe, expect, it } from "vitest"
import {
  createDashboardRuntimeIssue,
  getDashboardMissingEnvVars,
  getDashboardRuntimeIssue,
} from "@/lib/dashboard/runtime-issues"

describe("dashboard runtime issues", () => {
  it("detects missing dashboard env vars", () => {
    expect(
      getDashboardMissingEnvVars({
        DATABASE_URL: "",
        NEXTAUTH_SECRET: "set",
      })
    ).toEqual(["DATABASE_URL"])
  })

  it("accepts postgres alias env vars for database connectivity", () => {
    expect(
      getDashboardMissingEnvVars({
        DATABASE_URL: "",
        POSTGRES_PRISMA_URL: "postgresql://alias-user:alias-pass@host:5432/db",
        NEXTAUTH_SECRET: "set",
      })
    ).toEqual([])
  })

  it("builds a database-specific dashboard message", () => {
    expect(createDashboardRuntimeIssue(["DATABASE_URL"])).toEqual({
      title: "Dashboard temporarily unavailable",
      message:
        "The dashboard can't load because this deployment is missing its database connection setting.",
      missing: ["DATABASE_URL"],
    })
  })

  it("maps thrown config errors back to a dashboard issue", () => {
    expect(
      getDashboardRuntimeIssue(
        new Error(
          "DATABASE_URL is not set. Add it to your local environment and Vercel project settings."
        )
      )
    ).toEqual({
      title: "Dashboard temporarily unavailable",
      message:
        "The dashboard can't load because this deployment is missing its database connection setting.",
      missing: ["DATABASE_URL"],
    })
  })
})
