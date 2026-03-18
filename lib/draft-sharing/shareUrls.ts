/**
 * Draft share URLs and copy text (PROMPT 294) — image + link back to app.
 */

export type DraftShareChannel = 'x' | 'twitter' | 'reddit' | 'instagram' | 'discord' | 'copy_link'

const HASHTAGS = ['AllFantasy', 'FantasyFootball', 'DraftGrades']

export function buildDraftShareUrl(
  channel: DraftShareChannel,
  options: { title: string; shareUrl: string; leagueName?: string }
): string {
  const { title, shareUrl, leagueName } = options
  const text = leagueName ? `${title} — ${leagueName}` : title
  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedText = encodeURIComponent(`${text}\n\n${shareUrl}`)

  switch (channel) {
    case 'x':
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodedText}`
    case 'reddit':
      return `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent(title)}`
    case 'instagram':
    case 'discord':
    case 'copy_link':
      return ''
    default:
      return ''
  }
}

export function getDraftShareCopyText(
  channel: DraftShareChannel,
  options: { title: string; shareUrl: string; leagueName?: string }
): string {
  const { title, shareUrl, leagueName } = options
  const line = leagueName ? `${title} — ${leagueName}` : title
  switch (channel) {
    case 'x':
    case 'twitter':
      return [line, shareUrl, HASHTAGS.map((h) => `#${h}`).join(' ')].filter(Boolean).join('\n\n')
    case 'instagram':
      return [line, shareUrl, HASHTAGS.map((h) => `#${h}`).join(' ')].join('\n\n')
    case 'discord':
      return [line, shareUrl].join('\n\n')
    case 'reddit':
      return `${line}\n\n${shareUrl}`
    case 'copy_link':
      return shareUrl
    default:
      return shareUrl
  }
}
