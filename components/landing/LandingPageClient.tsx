'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowRight, Shield } from 'lucide-react'
import LanguageToggle from '@/components/i18n/LanguageToggle'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import { loginUrlWithIntent, signupUrlWithIntent } from '@/lib/auth/auth-intent-resolver'
import { trackLandingCtaClick } from '@/lib/landing-analytics'

const LANDING_COPY = {
  en: {
    nav: {
      brand: 'AllFantasy',
      signIn: 'Sign In',
      createAccount: 'Create Free Account',
      dashboard: 'Dashboard',
      openApp: 'Open App',
      admin: 'Admin',
    },
    badge: 'Coming Spring 2026! Early Signups Available',
    hero: {
      titleTop: 'Fantasy Sports',
      titleBottom: 'With AI Superpowers',
      subtitle:
        'The only fantasy sports platform with an AI that actually knows your league. Draft smarter, analyze trades, dominate waivers, and win across every sport.',
      primary: 'Create Free Account',
      secondary: 'Sign In',
      primaryAuthed: 'Open App',
      secondaryAuthed: 'Dashboard',
    },
    sports: ['NFL', 'NBA', 'NHL', 'MLB', 'NCAA Football', 'NCAA Basketball', 'Soccer'],
    whatIs: {
      eyebrow: 'What is AllFantasy.ai?',
      titleTop: 'One Platform.',
      titleBottom: 'Every Sport. Every Edge.',
      subtitle:
        'AllFantasy.ai brings real AI into every corner of your fantasy season, from draft day to championship week. Sync your leagues and let the platform do the heavy lifting.',
      pillars: [
        {
          icon: '🏆',
          title: 'All Leagues',
          body: 'NFL, NBA, MLB, NHL, Dynasty, Devy, C2C, and more in one platform.',
        },
        {
          icon: '🤖',
          title: 'Real AI',
          body: 'Chimmy knows your roster, scoring rules, and matchup context before making recommendations.',
        },
        {
          icon: '📡',
          title: 'Live Data',
          body: 'Player news, injuries, trends, and fantasy context update across every supported sport.',
        },
        {
          icon: '🎯',
          title: 'Real Edges',
          body: 'Trade grades, waiver priorities, draft strategy, and matchup help tuned to your league.',
        },
      ],
    },
    tools: {
      eyebrow: 'AI Tools',
      titleTop: 'Everything You Need to',
      titleBottom: 'Win Your League',
      subtitle:
        'Six AI-powered tools built for managers who want every advantage.',
      cards: [
        {
          icon: '⚖️',
          title: 'Trade Analyzer',
          body: 'AI fairness scores, value deltas, and lineup impact analysis before you accept or reject a deal.',
          previewTitle: 'Example output',
          previewLines: ['Fairness score: 92/100', 'Lineup swing: +11.8 pts', 'Verdict: accept if WR depth matters'],
        },
        {
          icon: '📋',
          title: 'Waiver Wire AI',
          body: 'Prioritized pickups with roster-fit confidence, FAAB guidance, and streaming fallbacks.',
          previewTitle: 'Example output',
          previewLines: ['Top claim: Jaxon Smith-Njigba', 'Suggested FAAB: 12-15%', 'Fallback: stream Chargers D/ST'],
        },
        {
          icon: '🎯',
          title: 'Draft Assistant',
          body: 'Live draft help with tier awareness, ADP tracking, and need-based pivot suggestions.',
          previewTitle: 'Live draft cue',
          previewLines: ['Tier break in 2 picks', 'Best value: DeVonta Smith', 'Pivot if RB run continues'],
        },
        {
          icon: '🔬',
          title: 'Player Comparison Lab',
          body: 'Compare players with projections, injury context, and usage trends in one view.',
          previewTitle: 'Comparison snapshot',
          previewLines: ['Projection: 18.4 vs 15.9', 'Target share edge: +6.2%', 'Injury risk: low vs medium'],
        },
        {
          icon: '🎮',
          title: 'Matchup Simulator',
          body: 'Simulate weekly matchups and playoff scenarios with lineup optimization built in.',
          previewTitle: 'Simulation snapshot',
          previewLines: ['Win odds: 63%', 'Median score: 128.4', 'Best flex swap adds 4.7 pts'],
        },
        {
          icon: '🧠',
          title: 'Chimmy AI Coach',
          body: 'Ask anything. Chimmy knows your roster, your opponents, and the scoring context that matters.',
          previewTitle: 'Example response',
          previewLines: ['Start Nico Collins over Pittman.', 'You need ceiling this week.', 'Opponent is weak against outside WRs.'],
        },
      ],
      previewLabel: 'See how it works',
    },
    stats: [
      { value: '1M+', label: 'AI analyses run' },
      { value: '13K+', label: 'Players tracked' },
      { value: '7', label: 'Sports covered' },
    ],
    cta: {
      title: 'Ready to Start Winning?',
      body:
        'Create your free account, sync your league, and let AllFantasy go to work.',
      primary: 'Create Free Account',
      secondary: 'Sign In',
      primaryAuthed: 'Open App',
      secondaryAuthed: 'Dashboard',
    },
    footer: {
      privacy: 'Privacy',
      terms: 'Terms',
      dataDeletion: 'Data Deletion',
      openApp: 'Open App',
      signIn: 'Sign In',
      admin: 'Admin',
    },
  },
  es: {
    nav: {
      brand: 'AllFantasy',
      signIn: 'Iniciar sesión',
      createAccount: 'Crear cuenta gratis',
      dashboard: 'Panel',
      openApp: 'Abrir app',
      admin: 'Admin',
    },
    badge: 'Llega en primavera de 2026. Registros anticipados disponibles',
    hero: {
      titleTop: 'Fantasy Sports',
      titleBottom: 'Con superpoderes de IA',
      subtitle:
        'La única plataforma de fantasy sports con una IA que realmente conoce tu liga. Draftea mejor, analiza trades, domina waivers y gana en cualquier deporte.',
      primary: 'Crear cuenta gratis',
      secondary: 'Iniciar sesión',
      primaryAuthed: 'Abrir app',
      secondaryAuthed: 'Panel',
    },
    sports: ['NFL', 'NBA', 'NHL', 'MLB', 'Fútbol NCAA', 'Baloncesto NCAA', 'Soccer'],
    whatIs: {
      eyebrow: '¿Qué es AllFantasy.ai?',
      titleTop: 'Una plataforma.',
      titleBottom: 'Cada deporte. Cada ventaja.',
      subtitle:
        'AllFantasy.ai lleva IA real a cada parte de tu temporada, desde el draft hasta la final. Sincroniza tus ligas y deja que la plataforma haga el trabajo pesado.',
      pillars: [
        {
          icon: '🏆',
          title: 'Todas tus ligas',
          body: 'NFL, NBA, MLB, NHL, Dynasty, Devy, C2C y más en una sola plataforma.',
        },
        {
          icon: '🤖',
          title: 'IA real',
          body: 'Chimmy conoce tu roster, tu sistema de puntuación y el contexto antes de recomendar.',
        },
        {
          icon: '📡',
          title: 'Datos en vivo',
          body: 'Noticias, lesiones, tendencias y contexto fantasy actualizados en todos los deportes.',
        },
        {
          icon: '🎯',
          title: 'Ventajas reales',
          body: 'Trades, waivers, draft y matchups ajustados a la configuración específica de tu liga.',
        },
      ],
    },
    tools: {
      eyebrow: 'Herramientas IA',
      titleTop: 'Todo lo que necesitas para',
      titleBottom: 'ganar tu liga',
      subtitle:
        'Seis herramientas impulsadas por IA para managers que quieren cada ventaja posible.',
      cards: [
        {
          icon: '⚖️',
          title: 'Trade Analyzer',
          body: 'Puntajes de equidad, valor y efecto en tu lineup antes de aceptar o rechazar un trade.',
          previewTitle: 'Ejemplo',
          previewLines: ['Puntaje de equidad: 92/100', 'Impacto en lineup: +11.8 pts', 'Veredicto: aceptar si necesitas profundidad WR'],
        },
        {
          icon: '📋',
          title: 'Waiver Wire AI',
          body: 'Prioridades de pickups con ajuste a tu roster, sugerencia FAAB y opciones de streaming.',
          previewTitle: 'Ejemplo',
          previewLines: ['Mejor claim: Jaxon Smith-Njigba', 'FAAB sugerido: 12-15%', 'Plan B: stream Chargers D/ST'],
        },
        {
          icon: '🎯',
          title: 'Draft Assistant',
          body: 'Ayuda en vivo para el draft con tiers, ADP y pivotes según necesidad.',
          previewTitle: 'Señal en draft',
          previewLines: ['Quedan 2 picks antes del tier break', 'Mejor valor: DeVonta Smith', 'Pivota si sigue la corrida de RB'],
        },
        {
          icon: '🔬',
          title: 'Player Comparison Lab',
          body: 'Compara jugadores con proyecciones, contexto de lesiones y tendencias de uso.',
          previewTitle: 'Comparativa',
          previewLines: ['Proyección: 18.4 vs 15.9', 'Ventaja target share: +6.2%', 'Riesgo de lesión: bajo vs medio'],
        },
        {
          icon: '🎮',
          title: 'Matchup Simulator',
          body: 'Simula enfrentamientos semanales y escenarios de playoffs con optimización de lineup.',
          previewTitle: 'Simulación',
          previewLines: ['Probabilidad de ganar: 63%', 'Puntaje medio: 128.4', 'Mejor cambio en flex suma 4.7 pts'],
        },
        {
          icon: '🧠',
          title: 'Chimmy AI Coach',
          body: 'Pregunta lo que quieras. Chimmy conoce tu roster, tus rivales y tu sistema de puntuación.',
          previewTitle: 'Respuesta ejemplo',
          previewLines: ['Inicia a Nico Collins sobre Pittman.', 'Esta semana necesitas techo.', 'Tu rival sufre contra WR abiertos.'],
        },
      ],
      previewLabel: 'Mira como funciona',
    },
    stats: [
      { value: '1M+', label: 'Análisis IA ejecutados' },
      { value: '13K+', label: 'Jugadores rastreados' },
      { value: '7', label: 'Deportes cubiertos' },
    ],
    cta: {
      title: '¿Listo para empezar a ganar?',
      body:
        'Crea tu cuenta gratis, sincroniza tu liga y deja que AllFantasy se ponga a trabajar.',
      primary: 'Crear cuenta gratis',
      secondary: 'Iniciar sesión',
      primaryAuthed: 'Abrir app',
      secondaryAuthed: 'Panel',
    },
    footer: {
      privacy: 'Privacidad',
      terms: 'Términos',
      dataDeletion: 'Eliminar datos',
      openApp: 'Abrir app',
      signIn: 'Iniciar sesión',
      admin: 'Admin',
    },
  },
} as const

function GradientWord({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        backgroundImage: 'linear-gradient(90deg, var(--accent-cyan), color-mix(in srgb, var(--accent-cyan-strong) 72%, #3b82f6))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
    >
      {children}
    </span>
  )
}

export default function LandingPageClient() {
  const { language } = useLanguage()
  const { status } = useSession()
  const copy = LANDING_COPY[language === 'es' ? 'es' : 'en']
  const isAuthenticated = status === 'authenticated'

  const primaryHref = isAuthenticated ? '/app' : signupUrlWithIntent('/dashboard')
  const secondaryHref = isAuthenticated ? '/dashboard' : loginUrlWithIntent('/dashboard')
  const primaryLabel = isAuthenticated ? copy.hero.primaryAuthed : copy.hero.primary
  const secondaryLabel = isAuthenticated ? copy.hero.secondaryAuthed : copy.hero.secondary

  return (
    <main className="mode-readable min-h-screen overflow-x-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <header
        className="fixed inset-x-0 top-0 z-50 border-b"
        style={{
          borderColor: 'var(--border)',
          background: 'color-mix(in srgb, var(--bg) 86%, transparent)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }}
      >
        <div className="mx-auto flex h-[60px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center rounded-2xl border px-4 py-2.5"
            aria-label="AllFantasy home"
            style={{
              borderColor: 'color-mix(in srgb, white 10%, var(--border))',
              background: 'color-mix(in srgb, var(--panel) 72%, transparent)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
            }}
          >
            <Image
              src="/af-logo-text.png"
              alt="AllFantasy"
              width={1024}
              height={512}
              priority
              className="h-[26px] w-auto object-contain sm:h-[32px]"
              style={{ mixBlendMode: 'screen' }}
            />
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex">
              <LanguageToggle />
            </div>
            <Link
              href="/admin"
              className="hidden rounded-lg border px-3 py-1.5 text-xs font-medium transition sm:inline-flex"
              style={{
                borderColor: 'color-mix(in srgb, var(--border) 75%, transparent)',
                color: 'var(--muted)',
                background: 'transparent',
              }}
            >
              <Shield className="mr-1 h-3.5 w-3.5" />
              {copy.nav.admin}
            </Link>
            <Link
              href={secondaryHref}
              className="rounded-lg border px-3 py-2 text-sm font-medium transition hover:opacity-90"
              style={{
                borderColor: 'color-mix(in srgb, var(--border) 100%, transparent)',
                color: 'var(--muted)',
                background: 'transparent',
              }}
              data-testid="landing-nav-secondary"
              onClick={() =>
                trackLandingCtaClick({
                  cta_label: secondaryLabel,
                  cta_destination: secondaryHref,
                  cta_type: 'secondary',
                  source: 'nav',
                })
              }
            >
              {secondaryLabel}
            </Link>
            <Link
              href={primaryHref}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, var(--accent-cyan), color-mix(in srgb, var(--accent-cyan-strong) 72%, #3b82f6))',
                color: 'var(--on-accent-bg)',
              }}
              data-testid="landing-nav-primary"
              onClick={() =>
                trackLandingCtaClick({
                  cta_label: primaryLabel,
                  cta_destination: primaryHref,
                  cta_type: 'primary',
                  source: 'nav',
                })
              }
            >
              {primaryLabel}
            </Link>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl items-center justify-end px-4 pb-2 md:hidden">
          <LanguageToggle />
        </div>
      </header>

      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-28 text-center sm:px-8 md:pb-24">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 55% 50% at 50% 38%, color-mix(in srgb, var(--accent-cyan) 18%, transparent) 0%, transparent 65%),
              radial-gradient(ellipse 40% 35% at 60% 30%, rgba(59,130,246,0.08) 0%, transparent 65%),
              radial-gradient(ellipse 65% 55% at 50% 48%, color-mix(in srgb, var(--accent-purple) 10%, transparent) 0%, transparent 70%)
            `,
          }}
          aria-hidden="true"
        />
        <div className="landing-grid pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 mb-8">
          <div className="landing-crest-glow absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-[520px] sm:w-[520px]" aria-hidden="true" />
          <div
            className="landing-float relative flex flex-col items-center justify-center gap-4 px-4 py-2 sm:gap-5 sm:px-6 sm:py-4"
            style={{
              filter: 'drop-shadow(0 28px 90px rgba(4,9,21,0.42))',
            }}
          >
            <div
              className="pointer-events-none absolute left-1/2 top-[42%] h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-[340px] sm:w-[340px]"
              aria-hidden="true"
              style={{
                background:
                  'radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--accent-cyan) 22%, transparent) 0%, transparent 62%), radial-gradient(circle at 50% 68%, color-mix(in srgb, var(--accent-purple) 12%, transparent) 0%, transparent 74%)',
              }}
            />
            <div className="relative flex items-center justify-center">
              <div
                className="pointer-events-none absolute h-[180px] w-[180px] rounded-full sm:h-[220px] sm:w-[220px]"
                aria-hidden="true"
                style={{
                  background:
                    'radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 18%, transparent) 0%, transparent 70%)',
                }}
              />
              <Image
                src="/af-crest.png"
                alt="AllFantasy crest"
                width={768}
                height={768}
                priority
                className="mode-logo-safe relative h-[132px] w-auto object-contain sm:h-[170px]"
                style={{
                  mixBlendMode: 'screen',
                  filter: 'brightness(1.04) saturate(1.08) drop-shadow(0 18px 42px rgba(14,165,233,0.22))',
                }}
              />
            </div>
            <Image
              src="/af-logo-text.png"
              alt="AllFantasy"
              width={1024}
              height={512}
              className="relative h-[34px] w-auto object-contain sm:h-[46px]"
              style={{
                mixBlendMode: 'screen',
                filter: 'brightness(1.04) saturate(1.08) drop-shadow(0 10px 24px rgba(59,130,246,0.16))',
              }}
            />
          </div>
        </div>

        <div
          className="relative z-10 mb-6 inline-flex max-w-[min(92vw,34rem)] items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-center text-[11px] font-semibold tracking-[0.06em] sm:text-xs"
          style={{
            background: 'color-mix(in srgb, var(--accent-amber) 10%, transparent)',
            borderColor: 'color-mix(in srgb, var(--accent-amber) 28%, transparent)',
            color: 'var(--accent-amber-strong)',
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--accent-amber-strong)', animation: 'landingPulse 2s ease-in-out infinite' }}
          />
          {copy.badge}
        </div>

        <h1 className="relative z-10 mb-5 max-w-5xl text-[58px] font-black leading-[0.93] tracking-[0.025em] sm:text-[74px] md:text-[92px]">
          <span className="block">{copy.hero.titleTop}</span>
          <span className="block">
            <GradientWord>{copy.hero.titleBottom}</GradientWord>
          </span>
        </h1>

        <p className="relative z-10 mb-10 max-w-2xl text-base leading-7 sm:text-lg" style={{ color: 'var(--muted)' }}>
          {copy.hero.subtitle}
        </p>

        <div className="relative z-10 mb-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={primaryHref}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:opacity-90"
            style={{
              backgroundImage:
                'linear-gradient(90deg, var(--accent-cyan), color-mix(in srgb, var(--accent-cyan-strong) 72%, #3b82f6))',
              color: 'var(--on-accent-bg)',
            }}
            data-testid="landing-hero-primary"
            onClick={() =>
              trackLandingCtaClick({
                cta_label: primaryLabel,
                cta_destination: primaryHref,
                cta_type: 'primary',
                source: 'hero',
              })
            }
          >
            {primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={secondaryHref}
            className="inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-medium transition hover:-translate-y-0.5"
            style={{
              background: 'color-mix(in srgb, var(--panel) 88%, transparent)',
              borderColor: 'color-mix(in srgb, var(--border) 100%, transparent)',
              color: 'var(--text)',
            }}
            data-testid="landing-hero-secondary"
            onClick={() =>
              trackLandingCtaClick({
                cta_label: secondaryLabel,
                cta_destination: secondaryHref,
                cta_type: 'secondary',
                source: 'hero',
              })
            }
          >
            {secondaryLabel}
          </Link>
        </div>

        <div className="relative z-10 flex max-w-4xl flex-wrap items-center justify-center gap-2" aria-label="Supported sports">
          {copy.sports.map((sport) => (
            <span
              key={sport}
              className="rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{
                background: 'color-mix(in srgb, var(--panel2) 78%, transparent)',
                borderColor: 'color-mix(in srgb, var(--border) 100%, transparent)',
                color: 'var(--muted)',
              }}
            >
              {sport}
            </span>
          ))}
        </div>
      </section>

      <div className="mx-6 border-t" style={{ borderColor: 'var(--border)' }} />

      <section className="mx-auto max-w-6xl px-6 py-20 text-center sm:px-8" aria-labelledby="landing-what-is">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-emerald-strong)' }}>
          {copy.whatIs.eyebrow}
        </p>
        <h2 id="landing-what-is" className="mb-4 text-[40px] font-black leading-[0.98] tracking-[0.025em] sm:text-[52px] md:text-[62px]">
          <span className="block">{copy.whatIs.titleTop}</span>
          <span className="block">{copy.whatIs.titleBottom}</span>
        </h2>
        <p className="mx-auto mb-12 max-w-3xl text-[17px] leading-8" style={{ color: 'var(--muted)' }}>
          {copy.whatIs.subtitle}
        </p>

        <div className="grid overflow-hidden rounded-2xl border sm:grid-cols-2 xl:grid-cols-4" style={{ borderColor: 'var(--border)', gap: 1, background: 'var(--border)' }}>
          {copy.whatIs.pillars.map((pillar) => (
            <div key={pillar.title} className="px-6 py-8 transition-opacity hover:opacity-95" style={{ background: 'var(--panel)' }}>
              <div className="mb-3 text-[28px]">{pillar.icon}</div>
              <h3 className="mb-2 text-[15px] font-semibold">{pillar.title}</h3>
              <p className="text-sm leading-6" style={{ color: 'var(--muted)' }}>
                {pillar.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-6 border-t" style={{ borderColor: 'var(--border)' }} />

      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8" aria-labelledby="landing-tools">
        <div className="mb-12 text-center">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-emerald-strong)' }}>
            {copy.tools.eyebrow}
          </p>
          <h2 id="landing-tools" className="mb-4 text-[40px] font-black leading-[0.98] tracking-[0.025em] sm:text-[52px] md:text-[62px]">
            <span className="block">{copy.tools.titleTop}</span>
            <span className="block">
              <GradientWord>{copy.tools.titleBottom}</GradientWord>
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-[17px] leading-8" style={{ color: 'var(--muted)' }}>
            {copy.tools.subtitle}
          </p>
        </div>

        <div className="grid overflow-hidden rounded-2xl border md:grid-cols-2 xl:grid-cols-3" style={{ borderColor: 'var(--border)', gap: 1, background: 'var(--border)' }}>
          {copy.tools.cards.map((card) => (
            <article key={card.title} className="group relative px-8 py-8 transition-opacity hover:opacity-95" style={{ background: 'var(--panel)' }}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border text-xl" style={{ background: 'color-mix(in srgb, var(--accent-cyan) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--accent-cyan) 18%, transparent)' }}>
                {card.icon}
              </div>
              <h3 className="mb-3 text-base font-semibold">{card.title}</h3>
              <p className="mb-5 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                {card.body}
              </p>
              <div
                className="rounded-2xl border p-4 text-left"
                style={{
                  background: 'color-mix(in srgb, var(--panel2) 86%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--accent-cyan) 16%, var(--border))',
                }}
              >
                <div
                  className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: 'var(--accent-emerald-strong)' }}
                >
                  {card.previewTitle ?? copy.tools.previewLabel}
                </div>
                <div className="space-y-2">
                  {card.previewLines.map((line) => (
                    <div
                      key={line}
                      className="rounded-xl border px-3 py-2 text-xs font-medium sm:text-[13px]"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--border) 92%, transparent)',
                        background: 'color-mix(in srgb, white 3%, transparent)',
                        color: 'var(--text)',
                      }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20 sm:px-8">
        <div className="grid overflow-hidden rounded-2xl border md:grid-cols-3" style={{ borderColor: 'var(--border)', gap: 1, background: 'var(--border)' }}>
          {copy.stats.map((stat) => (
            <div key={stat.label} className="px-6 py-10 text-center" style={{ background: 'var(--panel)' }}>
              <div className="mb-2 text-5xl font-black leading-none">
                <GradientWord>{stat.value}</GradientWord>
              </div>
              <div className="text-sm font-medium tracking-[0.03em]" style={{ color: 'var(--muted)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden px-6 pb-24 pt-4 text-center sm:px-8" aria-labelledby="landing-cta">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 65% 80% at 50% 50%, color-mix(in srgb, var(--accent-cyan) 12%, transparent) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />
        <Image
          src="/af-crest.png"
          alt=""
          width={280}
          height={280}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.05] sm:h-[280px] sm:w-[280px]"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-3xl">
          <h2 id="landing-cta" className="mb-4 text-[42px] font-black leading-[1] tracking-[0.025em] sm:text-[56px] md:text-[68px]">
            {copy.cta.title}
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-[17px] leading-8" style={{ color: 'var(--muted)' }}>
            {copy.cta.body}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={primaryHref}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:opacity-90"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, var(--accent-cyan), color-mix(in srgb, var(--accent-cyan-strong) 72%, #3b82f6))',
                color: 'var(--on-accent-bg)',
              }}
              data-testid="landing-cta-primary"
              onClick={() =>
                trackLandingCtaClick({
                  cta_label: isAuthenticated ? copy.cta.primaryAuthed : copy.cta.primary,
                  cta_destination: primaryHref,
                  cta_type: 'primary',
                  source: 'cta-band',
                })
              }
            >
              {isAuthenticated ? copy.cta.primaryAuthed : copy.cta.primary}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={secondaryHref}
              className="inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-medium transition hover:-translate-y-0.5"
              style={{
                background: 'color-mix(in srgb, var(--panel) 88%, transparent)',
                borderColor: 'color-mix(in srgb, var(--border) 100%, transparent)',
                color: 'var(--text)',
              }}
              data-testid="landing-cta-secondary"
              onClick={() =>
                trackLandingCtaClick({
                  cta_label: isAuthenticated ? copy.cta.secondaryAuthed : copy.cta.secondary,
                  cta_destination: secondaryHref,
                  cta_type: 'secondary',
                  source: 'cta-band',
                })
              }
            >
              {isAuthenticated ? copy.cta.secondaryAuthed : copy.cta.secondary}
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t px-6 py-7 sm:px-8" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-2xl border px-4 py-2.5"
            aria-label="AllFantasy home"
            style={{
              borderColor: 'color-mix(in srgb, white 10%, var(--border))',
              background: 'color-mix(in srgb, var(--panel) 68%, transparent)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <Image
              src="/af-logo-text.png"
              alt="AllFantasy"
              width={1024}
              height={512}
              className="h-[24px] w-auto object-contain sm:h-[28px]"
              style={{ mixBlendMode: 'screen' }}
            />
            <span className="text-sm" style={{ color: 'var(--muted2)' }}>
              © {new Date().getFullYear()} AllFantasy.ai. All rights reserved.
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-4 text-sm" aria-label="Footer navigation">
            <Link href="/privacy" style={{ color: 'var(--muted2)' }} className="transition hover:opacity-100">
              {copy.footer.privacy}
            </Link>
            <Link href="/terms" style={{ color: 'var(--muted2)' }} className="transition hover:opacity-100">
              {copy.footer.terms}
            </Link>
            <Link href="/data-deletion" style={{ color: 'var(--muted2)' }} className="transition hover:opacity-100">
              {copy.footer.dataDeletion}
            </Link>
            <Link
              href="/app"
              style={{ color: 'var(--muted2)' }}
              className="transition hover:opacity-100"
              onClick={() =>
                trackLandingCtaClick({
                  cta_label: copy.footer.openApp,
                  cta_destination: '/app',
                  cta_type: 'primary',
                  source: 'footer',
                })
              }
            >
              {copy.footer.openApp}
            </Link>
            <Link
              href={loginUrlWithIntent('/dashboard')}
              style={{ color: 'var(--muted2)' }}
              className="transition hover:opacity-100"
            >
              {copy.footer.signIn}
            </Link>
            <Link href="/admin" style={{ color: 'var(--muted2)' }} className="transition hover:opacity-100">
              {copy.footer.admin}
            </Link>
          </nav>
        </div>
      </footer>

      <style jsx>{`
        .landing-grid {
          background-image:
            linear-gradient(color-mix(in srgb, var(--border) 40%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in srgb, var(--border) 40%, transparent) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 75% 75% at 50% 50%, black 20%, transparent 78%);
          -webkit-mask-image: radial-gradient(ellipse 75% 75% at 50% 50%, black 20%, transparent 78%);
        }

        .landing-crest-glow {
          background: radial-gradient(
            circle,
            color-mix(in srgb, var(--accent-cyan) 28%, transparent) 0%,
            rgba(59, 130, 246, 0.16) 35%,
            color-mix(in srgb, var(--accent-purple) 12%, transparent) 58%,
            transparent 74%
          );
          filter: blur(6px);
        }

        .landing-float {
          animation: landingFloat 5s ease-in-out infinite;
        }

        @keyframes landingFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes landingPulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.25;
          }
        }
      `}</style>
    </main>
  )
}
