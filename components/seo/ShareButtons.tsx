"use client"

import {
  getSocialShareConfig,
  getTwitterShareUrl,
  getFacebookShareUrl,
  getLinkedInShareUrl,
} from "@/lib/seo"

export interface ShareButtonsProps {
  path: string
  title: string
  description: string
  className?: string
  testIdPrefix?: string
}

export function ShareButtons({
  path,
  title,
  description,
  className = "",
  testIdPrefix = "seo-share",
}: ShareButtonsProps) {
  const config = getSocialShareConfig({ path, title, description })
  const twitterUrl = getTwitterShareUrl(config)
  const facebookUrl = getFacebookShareUrl(config)
  const linkedInUrl = getLinkedInShareUrl(config)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>
        Share:
      </span>
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={`${testIdPrefix}-x`}
        className="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium hover:opacity-90"
        style={{ borderColor: "var(--border)", color: "var(--text)" }}
        aria-label="Share on X (Twitter)"
      >
        X
      </a>
      <a
        href={facebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={`${testIdPrefix}-facebook`}
        className="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium hover:opacity-90"
        style={{ borderColor: "var(--border)", color: "var(--text)" }}
        aria-label="Share on Facebook"
      >
        Facebook
      </a>
      <a
        href={linkedInUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={`${testIdPrefix}-linkedin`}
        className="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium hover:opacity-90"
        style={{ borderColor: "var(--border)", color: "var(--text)" }}
        aria-label="Share on LinkedIn"
      >
        LinkedIn
      </a>
    </div>
  )
}
