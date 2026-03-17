/**
 * Resolves JSON-LD structured data for SEO (schema.org).
 * Use for WebSite, SoftwareApplication, FAQPage, Organization.
 */

const BASE = "https://allfantasy.ai"

export interface WebSiteSchema {
  "@context": "https://schema.org"
  "@type": "WebSite"
  name: string
  url: string
  description?: string
  potentialAction?: { "@type": string; target: string; "query-input"?: string }[]
}

export interface SoftwareApplicationSchema {
  "@context": "https://schema.org"
  "@type": "SoftwareApplication"
  name: string
  applicationCategory: string
  operatingSystem?: string
  description?: string
  url?: string
  offers?: { "@type": string; price: string; priceCurrency: string }
}

export interface FAQPageSchema {
  "@context": "https://schema.org"
  "@type": "FAQPage"
  mainEntity: { "@type": string; name: string; acceptedAnswer: { "@type": string; text: string } }[]
}

export interface OrganizationSchema {
  "@context": "https://schema.org"
  "@type": "Organization"
  name: string
  url: string
  logo?: string
}

/** WebPage schema for page-level structured data. PROMPT 168. */
export interface WebPageSchema {
  "@context": "https://schema.org"
  "@type": "WebPage"
  name: string
  description?: string
  url: string
}

/** Default WebSite schema for the platform. */
export function getWebSiteSchema(): WebSiteSchema {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "AllFantasy",
    url: BASE,
    description:
      "AI-powered fantasy sports tools: trade analyzer, mock drafts, waiver advisor, bracket challenges, and league management.",
    potentialAction: [
      {
        "@type": "SearchAction",
        target: `${BASE}/tools-hub?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    ],
  }
}

/** SoftwareApplication schema for a tool page. */
export function getSoftwareApplicationSchema(opts: {
  name: string
  description: string
  url: string
  applicationCategory?: string
}): SoftwareApplicationSchema {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: opts.name,
    applicationCategory: opts.applicationCategory ?? "GameApplication",
    operatingSystem: "Web",
    description: opts.description,
    url: opts.url,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  }
}

/** FAQPage schema from Q&A pairs. */
export function getFAQPageSchema(
  faqs: { q: string; a: string }[]
): FAQPageSchema {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }
}

/** Organization schema for AllFantasy. */
export function getOrganizationSchema(): OrganizationSchema {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "AllFantasy",
    url: BASE,
    logo: `${BASE}/af-crest.png`,
  }
}

/** WebPage schema for a given page. Use with buildStructuredDataScript for page-level JSON-LD. */
export function getWebPageSchema(opts: {
  name: string
  description?: string
  url: string
}): WebPageSchema {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: opts.name,
    description: opts.description,
    url: opts.url.startsWith("http") ? opts.url : `${BASE}${opts.url}`,
  }
}

/** Return multiple schemas as JSON-LD array (single script payload). */
export function buildStructuredDataScript(
  schemas: object | object[]
): string {
  const arr = Array.isArray(schemas) ? schemas : [schemas]
  return JSON.stringify(arr.length === 1 ? arr[0] : arr)
}
