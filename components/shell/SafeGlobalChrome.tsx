"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import Script from "next/script"
import { AuthRouteGlobalChrome } from "@/components/auth/AuthRouteGlobalChrome"
import { shouldRegisterServiceWorker } from "@/lib/pwa/shouldRegisterServiceWorker"

const AUTH_ROUTE_PREFIXES = ["/login", "/signup", "/signin", "/auth"]

/**
 * Paths where the entire global chrome (including AuthRouteGlobalChrome and
 * the service-worker lifecycle) must NOT render. These are the historical
 * auth shells where any extra body content would cause hydration drift, PLUS
 * the World Cup bracket routes.
 *
 * Why /brackets/world-cup: SafeGlobalChrome uses `usePathname()` to gate
 * chrome. On the server the hook returns the real pathname; on the client
 * during the first hydration tick it returns `null` and the bail above fires.
 * When the server renders chrome but the client renders null the trees differ →
 * React #418 hydration mismatch → #423 client-only fallback → Next.js activates
 * global-error.tsx (which renders its own <html><body>) → HierarchyRequestError.
 * Adding the prefix here makes the server also render null for these paths so
 * both sides agree. Re-enable after the specific chrome culprit is bisected.
 */
const FULL_CHROME_BAIL_PREFIXES = [
  ...AUTH_ROUTE_PREFIXES,
  "/brackets/world-cup",
]

/**
 * Paths where DOM-mutating third-party scripts (Meta Pixel + Facebook SDK)
 * must NOT execute, but the React-only chrome (toaster, back-to-top, mode
 * toggle, service-worker lifecycle) is still safe to render. These cover
 * `/api/*` (so any not-found page served under an API path never injects the
 * pixel into the document), `/_next/*` (defensive), the username gate, and
 * the high-traffic product surfaces (`/dashboard`, `/brackets`) where the
 * Meta Pixel ↔ React hydration race has been observed crashing pages with
 * React #418/#423, HierarchyRequestError, and removeChild errors.
 */
const THIRD_PARTY_SCRIPT_BAIL_PREFIXES = [
  ...AUTH_ROUTE_PREFIXES,
  "/choose-username",
  "/dashboard",
  "/brackets",
  "/api",
  "/_next",
]

function matchesPrefix(
  pathname: string | null | undefined,
  prefixes: readonly string[],
): boolean {
  if (!pathname) return false
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function isAuthPath(pathname: string | null | undefined): boolean {
  return matchesPrefix(pathname, AUTH_ROUTE_PREFIXES)
}

function shouldBailChrome(pathname: string | null | undefined): boolean {
  return matchesPrefix(pathname, FULL_CHROME_BAIL_PREFIXES)
}

function shouldBailThirdPartyScripts(
  pathname: string | null | undefined,
): boolean {
  return matchesPrefix(pathname, THIRD_PARTY_SCRIPT_BAIL_PREFIXES)
}

/**
 * Client-side service worker lifecycle. Runs in `useEffect` so the work happens
 * after hydration and never participates in the SSR/CSR diff. Mirrors the
 * previous inline `beforeInteractive` script behaviour: register when the flag
 * is on, otherwise unregister any stale registration and purge our caches.
 */
function ServiceWorkerLifecycle() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return
    }

    if (shouldRegisterServiceWorker()) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* ignore registration failures — non-critical */
      })
      return
    }

    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(
          registrations.map((reg) => {
            const scriptUrl =
              reg.active?.scriptURL ||
              reg.waiting?.scriptURL ||
              reg.installing?.scriptURL ||
              ""
            if (!scriptUrl.includes("/sw.js")) {
              return Promise.resolve(false)
            }
            return reg.unregister()
          }),
        ),
      )
      .catch(() => {
        /* ignore — purely cleanup */
      })

    if (typeof caches === "undefined") return
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("AllFantasy-"))
            .map((key) => caches.delete(key)),
        ),
      )
      .catch(() => {
        /* ignore — purely cleanup */
      })
  }, [])

  return null
}

export interface SafeGlobalChromeProps {
  metaPixelId?: string
  fbAppId?: string
}

/**
 * Render-once umbrella for every piece of root chrome that must NOT execute on
 * auth routes (`/login`, `/signup`, `/signin`, `/auth/*`).
 *
 * Detection runs entirely inside a client component using `usePathname()` so it
 * does not depend on the middleware-injected `x-af-pathname` header surviving
 * the upstream proxy. The component is rendered as part of the root layout for
 * every request, so the server-rendered HTML and the client tree are always
 * consistent — eliminating the hydration mismatches (#418/#423,
 * HierarchyRequestError, NotFoundError) that previously crashed `/login` on
 * Railway when the header was stripped.
 */
export function SafeGlobalChrome({
  metaPixelId = "",
  fbAppId = "",
}: SafeGlobalChromeProps) {
  const pathname = usePathname()
  // EMERGENCY HARD BAIL: /brackets root has been crashing with React #418/#423,
  // HierarchyRequestError, and body-wipe even after the page was rolled back to
  // the minimal Phase 6 hardened JSX. The culprit lives somewhere in this chrome
  // umbrella (Meta Pixel race, double SW registration, Toaster portal, etc.).
  // While we bisect, refuse to mount ANY chrome on the exact /brackets path, and
  // also treat an unknown pathname (first client render) as unsafe.
  if (pathname === null || pathname === undefined) {
    return null
  }
  if (pathname === "/brackets") {
    return null
  }
  if (shouldBailChrome(pathname)) {
    return null
  }

  // On product surfaces and any /api/* fallback render, keep the React-only
  // chrome but suppress the DOM-mutating third-party scripts that race
  // against React hydration.
  const allowThirdPartyScripts = !shouldBailThirdPartyScripts(pathname)
  const renderMetaPixel = allowThirdPartyScripts && Boolean(metaPixelId)
  const renderFacebookSdk = allowThirdPartyScripts && Boolean(fbAppId)

  return (
    <>
      <ServiceWorkerLifecycle />

      {renderMetaPixel ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}
        </Script>
      ) : null}
      {renderMetaPixel ? (
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
      ) : null}

      {renderFacebookSdk ? <div id="fb-root" /> : null}
      {renderFacebookSdk ? (
        <Script
          src={`https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v25.0&appId=${fbAppId}`}
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      ) : null}

      <AuthRouteGlobalChrome />
    </>
  )
}

export { isAuthPath }
