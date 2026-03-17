/**
 * Builds Next.js Metadata and optional JSON-LD from SEO config.
 * Use in generateMetadata() and for injecting structured data.
 */

import type { Metadata } from "next"
import type { SEOPageConfig } from "./SEOPageResolver"
import { getDefaultOgImagePath } from "./SEOPageResolver"

const BASE = "https://allfantasy.ai"
const SITE_NAME = "AllFantasy"

export interface MetadataInput extends SEOPageConfig {
  imagePath?: string
}

/** Build Next.js Metadata from SEO config. */
export function buildMetadata(input: MetadataInput): Metadata {
  const imagePath = input.imagePath ?? getDefaultOgImagePath()
  const imageUrl = imagePath.startsWith("http") ? imagePath : `${BASE}${imagePath}`
  return {
    title: input.title,
    description: input.description,
    keywords: input.keywords,
    alternates: input.canonical ? { canonical: input.canonical } : undefined,
    openGraph: {
      title: input.title,
      description: input.description,
      url: input.canonical,
      siteName: SITE_NAME,
      type: "website",
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
    },
    robots: input.noIndex ? { index: false, follow: true } : { index: true, follow: true },
  }
}

/** Merge partial metadata with defaults (e.g. from layout). */
export function mergeMetadata(
  base: Metadata,
  override: Partial<Metadata>
): Metadata {
  return {
    ...base,
    ...override,
    openGraph: override?.openGraph
      ? { ...base.openGraph, ...override.openGraph }
      : base.openGraph,
    twitter: override?.twitter
      ? { ...base.twitter, ...override.twitter }
      : base.twitter,
  }
}
