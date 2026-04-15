import type { AppProps } from "next/app"

/**
 * Minimal Pages Router shell — the app is App Router–first; this exists so
 * `pages/500.tsx` (custom server error UI) has a valid companion `_app`.
 */
export default function PagesApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
