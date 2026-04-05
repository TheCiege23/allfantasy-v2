/**
 * True when `error` is the special throw from `redirect()` in the App Router.
 * Use in catch blocks so redirect propagation is not mistaken for a data error.
 */
export function isAppRouterRedirectError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false
  const digest = (error as { digest?: unknown }).digest
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")
}
