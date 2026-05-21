import { afterEach, describe, expect, it } from "vitest"
import {
  DEFAULT_PUBLIC_SITE_ORIGIN,
  getPublicSiteOrigin,
  normalizeBaseUrl,
} from "@/lib/site-public-origin"

const ENV_KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "PUBLIC_SITE_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_APP_DOMAIN",
  "NEXTAUTH_URL",
  "APP_URL",
  "SITE_URL",
  "RAILWAY_PUBLIC_DOMAIN",
  "VERCEL_URL",
] as const

function clearUrlEnv() {
  for (const key of ENV_KEYS) {
    delete process.env[key]
  }
}

afterEach(() => {
  clearUrlEnv()
})

describe("public site origin helpers", () => {
  it("falls back when input is missing", () => {
    expect(normalizeBaseUrl()).toBe(DEFAULT_PUBLIC_SITE_ORIGIN)
    expect(normalizeBaseUrl("")).toBe(DEFAULT_PUBLIC_SITE_ORIGIN)
  })

  it("falls back for protocol-only values", () => {
    expect(normalizeBaseUrl("https://")).toBe(DEFAULT_PUBLIC_SITE_ORIGIN)
    expect(normalizeBaseUrl("http://")).toBe(DEFAULT_PUBLIC_SITE_ORIGIN)
  })

  it("prefixes bare domains with https", () => {
    expect(normalizeBaseUrl("railway-preview.example.com")).toBe("https://railway-preview.example.com")
  })

  it("keeps valid http and https origins", () => {
    expect(normalizeBaseUrl("https://www.example.com/path?x=1")).toBe("https://www.example.com")
    expect(normalizeBaseUrl("http://localhost:3000/test")).toBe("http://localhost:3000")
  })

  it("does not throw for invalid input", () => {
    expect(normalizeBaseUrl("://not-a-url")).toBe(DEFAULT_PUBLIC_SITE_ORIGIN)
  })

  it("uses Railway public domains when canonical URLs are absent", () => {
    clearUrlEnv()
    process.env.RAILWAY_PUBLIC_DOMAIN = "allfantasy-production.up.railway.app"

    expect(getPublicSiteOrigin()).toBe("https://allfantasy-production.up.railway.app")
  })

  it("does not return raw https:// from env during prerender", () => {
    clearUrlEnv()
    process.env.NEXT_PUBLIC_SITE_URL = "https://"

    expect(getPublicSiteOrigin()).toBe(DEFAULT_PUBLIC_SITE_ORIGIN)
    expect(() => new URL(getPublicSiteOrigin())).not.toThrow()
  })
})
