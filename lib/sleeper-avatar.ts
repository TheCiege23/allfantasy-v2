/** Convert Sleeper avatar hash to CDN URL (thumbs for managers/leagues). */
export function sleeperAvatarUrl(hash: string | null | undefined): string | null {
  if (!hash) return null;
  const t = String(hash).trim();
  if (!t) return null;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  return `https://sleepercdn.com/avatars/thumbs/${t}`;
}
