"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import Script from "next/script"
import { AuthRouteGlobalChrome } from "@/components/auth/AuthRouteGlobalChrome"
import { shouldRegisterServiceWorker } from "@/lib/pwa/shouldRegisterServiceWorker"

const AUTH_ROUTE_PREFIXES = ["/login", "/signup", "/signin", "/auth"]

function isAuthPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return AUTH_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
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
  if (isAuthPath(pathname)) {
    return null
  }

  return (
    <>
      <ServiceWorkerLifecycle />

      {metaPixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}
        </Script>
      ) : null}
      {metaPixelId ? (
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

      <div id="fb-root" />
      <Script
        src={`https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v25.0&appId=${fbAppId}`}
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />

      <AuthRouteGlobalChrome />
    </>
  )
}

export { isAuthPath }
