import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { Toaster } from 'sonner';
import { cookies } from 'next/headers';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import SessionAppProvider from '@/components/providers/SessionAppProvider';
import { BackToTop } from '@/components/BackToTop';
import { LanguageProviderClient } from '@/components/i18n/LanguageProviderClient';
import { DefaultJsonLd } from '@/components/seo/JsonLd';
import SyncProfilePreferences from '@/components/auth/SyncProfilePreferences';
import { ReferralTracker } from '@/components/referral/ReferralTracker';
import { ErrorBoundaryClient } from '@/components/error-handling/ErrorBoundaryClient';
import { ErrorTrackingInit } from '@/components/error-handling/ErrorTrackingInit';
import WebVitalsTracker from '@/components/performance/WebVitalsTracker';
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration';
import { buildSeoMeta } from '@/lib/seo';
import { resolveEffectiveDataMode } from '@/lib/theme';
import {
  buildLanguageInitScript,
  buildThemeInitScript,
} from '@/lib/preferences/HtmlPreferenceSync';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700']
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover' as const,
};

export const metadata: Metadata = {
  ...buildSeoMeta({
    title: 'AllFantasy – AI Powered Fantasy Sports Tools',
    description:
      'AllFantasy combines fantasy sports leagues, bracket challenges, and AI-powered tools to help players draft smarter, analyze trades, and dominate their leagues.',
    canonical: 'https://allfantasy.ai/',
    keywords: [
      'fantasy sports',
      'fantasy football tools',
      'fantasy trade analyzer',
      'AI fantasy sports',
      'fantasy bracket challenge',
    ],
  }),
  icons: {
    icon: [
      { url: '/af-crest.png', type: 'image/png' },
    ],
    apple: '/af-crest.png',
  },
  manifest: '/manifest.webmanifest',
  robots: {
    index: true,
    follow: true,
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'mobile-web-app-capable': 'yes',
    'format-detection': 'telephone=no',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get('af_lang')?.value;
  const htmlLang = cookieLang === 'es' ? 'es' : 'en';
  const cookieMode = cookieStore.get('af_mode')?.value;
  const htmlMode = resolveEffectiveDataMode(cookieMode);
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';
  const fbAppId = process.env.NEXT_PUBLIC_FB_APP_ID || '1790659191546539';

  return (
    <html
      lang={htmlLang}
      data-lang={htmlLang}
      data-mode={htmlMode}
      className={`${inter.variable} scroll-smooth`}
      suppressHydrationWarning
    >
      <head>
        <Script id="af-init-mode" strategy="beforeInteractive">
          {buildThemeInitScript(htmlMode)}
        </Script>
        <Script id="af-init-lang" strategy="beforeInteractive">
          {buildLanguageInitScript(htmlLang)}
        </Script>

        {gaMeasurementId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="google-gtag" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){window.dataLayer.push(arguments);}
                window.gtag = window.gtag || gtag;
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}', { send_page_view: true });
                gtag('config', 'AW-17768764414');
              `}
            </Script>
          </>
        )}

        <DefaultJsonLd />
        <Script id="analytics-healthcheck" strategy="afterInteractive">
          {`
            (function() {
              try {
                var shouldDebug =
                  window.location.search.indexOf('af_debug_analytics=1') !== -1 ||
                  localStorage.getItem('af_debug_analytics') === '1';

                if (!shouldDebug) return;

                setTimeout(function() {
                  var hasDataLayer = Array.isArray(window.dataLayer);
                  var hasGtag = typeof window.gtag === 'function';

                  console.group('[AF Analytics Health]');
                  console.info('GA Measurement ID:', '${gaMeasurementId}');
                  console.info('window.gtag ready:', hasGtag);
                  console.info('window.dataLayer ready:', hasDataLayer);
                  console.info('dataLayer length:', hasDataLayer ? window.dataLayer.length : 0);

                  try {
                    if (hasGtag) {
                      window.gtag('event', 'af_analytics_healthcheck', {
                        page_path: window.location.pathname,
                        debug_mode: true,
                      });
                      console.info('Sent test event: af_analytics_healthcheck');
                    } else {
                      console.warn('gtag not ready; test event not sent');
                    }
                  } catch (err) {
                    console.warn('Failed to send test event', err);
                  }

                  fetch('/api/analytics/debug', { cache: 'no-store' })
                    .then(function(r){ return r.json(); })
                    .then(function(data){ console.info('/api/analytics/debug =>', data); })
                    .catch(function(err){ console.warn('Debug endpoint failed', err); })
                    .finally(function(){ console.groupEnd(); });
                }, 1500);
              } catch (e) {
                console.warn('[AF Analytics Health] init failed', e);
              }
            })();
          `}
        </Script>

        {metaPixelId && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${metaPixelId}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}
      </head>

      <body
        className={`${inter.variable} antialiased min-h-screen mode-readable`}
        style={{ background: 'var(--bg)', color: 'var(--text)' }}
      >
        {metaPixelId && (
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        )}

        <div id="fb-root"></div>

        <Script
          src={`https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v25.0&appId=${fbAppId}`}
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />

        <SessionAppProvider>
          <ThemeProvider>
            <LanguageProviderClient>
              <ErrorTrackingInit />
              <WebVitalsTracker />
              <ServiceWorkerRegistration />
              <ReferralTracker />
              <SyncProfilePreferences />
              <ErrorBoundaryClient>
                {children}
              </ErrorBoundaryClient>
              <Toaster position="top-center" richColors closeButton />
              <BackToTop />
            </LanguageProviderClient>
          </ThemeProvider>
        </SessionAppProvider>
      </body>
    </html>
  );
}


