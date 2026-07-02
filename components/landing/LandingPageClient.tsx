'use client'

import type { ReactNode } from 'react'
import type { Session } from 'next-auth'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useOptionalSession } from '@/components/auth/useOptionalSession'
import { ArrowRight, Shield, TrendingUp, Users, Layers, Building2 } from 'lucide-react'
import LanguageToggle from '@/components/i18n/LanguageToggle'
import { useOptionalLanguage } from '@/components/i18n/LanguageProviderClient'
import { ThemeModeSelect } from '@/components/theme/ThemeModeSelect'
import { loginUrlWithIntent, signupUrlWithIntent } from '@/lib/auth/auth-intent-resolver'
import { trackLandingCtaClick } from '@/lib/landing-analytics'

/**
 * Copy is self-contained (not the global `t()` dictionary) to keep this page's
 * translations reviewable as one unit — the same pattern this file already used
 * before this redesign. `en` is authoritative; other locales mirror its shape.
 * Falls back to `en` for any locale not listed here (see `copy` below).
 */
const LANDING_COPY = {
  en: {
    nav: {
      brand: 'AllFantasy',
      products: 'Products',
      solutions: 'Solutions',
      resources: 'Resources',
      pricing: 'Pricing',
      company: 'Company',
      signIn: 'Sign In',
      signUp: 'Get Started Free',
      dashboard: 'Dashboard',
      admin: 'Admin',
      ariaHome: 'AllFantasy home',
      ariaFooterNav: 'Footer navigation',
    },
    hero: {
      headlinePrefix: 'The ',
      headlineGradient: 'Intelligence Platform',
      headlineSuffix: ' for Fantasy Sports.',
      subtitle:
        'AllFantasy turns real league and user data into better decisions for players, commissioners, and fantasy platforms.',
      primary: 'Get Started Free',
      secondary: 'Watch Overview',
      alreadyHaveAccount: 'Already have an account? Sign in',
      primaryAuthed: 'Go to Dashboard',
      reassurance: 'Free for players · Commissioners from $4.99/mo · Cancel anytime',
      trust: [
        'Fantasy Sports Only',
        'No Gambling',
        'Secure & Private',
        'Commissioner First',
        'Free for Players',
      ],
      preview: {
        title: 'League Pulse',
        leagueHealthLabel: 'League Health',
        leagueHealthValue: '91',
        retentionLabel: 'Retention Forecast',
        retentionValue: '94%',
        activityLabel: 'Activity Trend',
        topRiskLabel: 'Top Risk',
        topRiskValue: '3 inactive owners',
      },
    },
    products: {
      eyebrow: 'Four Products',
      title: 'Four Products. Built for Every Role.',
      subtitle: 'Choose the product that fits you. Or use them together.',
      cards: [
        {
          key: 'app',
          color: 'blue',
          icon: 'layers',
          title: 'Fantasy Sports App',
          tagline: 'Play. Compete. Win.',
          description: 'Everything you need to run and win your fantasy leagues.',
          bullets: ['Live scoring & matchups', 'Drafts, waivers & trades', 'Rosters & lineup management', 'Chat, activity & notifications'],
          cta: 'Enter Fantasy App',
          href: '/dashboard',
        },
        {
          key: 'league-intel',
          color: 'green',
          icon: 'trending',
          title: 'League Intelligence OS',
          tagline: 'Grow healthier leagues.',
          description: 'Tools for commissioners and operators to improve retention, engagement, and league performance.',
          bullets: ['League health & retention', 'Competitive balance', 'Automation & alerts', 'Reports & benchmarking'],
          cta: 'Explore League Intelligence',
          href: '/commissioner-hub',
        },
        {
          key: 'user-intel',
          color: 'purple',
          icon: 'users',
          title: 'User Intelligence',
          tagline: 'Understand every manager.',
          description: 'Behavior and engagement insights that help platforms understand and retain users.',
          bullets: ['Manager DNA & profiling', 'Engagement scoring', 'Behavior trend analysis', 'Segmentation & insights'],
          cta: 'View User Intelligence',
          href: '/commissioner-hub',
        },
        {
          key: 'platform-intel',
          color: 'orange',
          icon: 'building',
          title: 'Platform Intelligence',
          tagline: 'Power fantasy at scale.',
          description: 'APIs, SDKs, dashboards, and white-label intelligence for fantasy platforms and partners.',
          bullets: ['White-label intelligence', 'SDK & API access', 'Custom dashboards', 'Enterprise support'],
          cta: 'Partner With Us',
          href: 'mailto:support@allfantasy.ai?subject=Partnerships%20Inquiry',
        },
      ],
    },
    dfs: {
      eyebrow: 'Future Intelligence Verticals',
      body:
        'The same intelligence framework can support DFS, pick’em, sportsbook-adjacent analytics, and partner risk tools where legally permitted and compliance-approved.',
    },
    trustedStrip: {
      title: 'Trusted by commissioners. Built for every format.',
      compatLabel: 'Compatible with',
      platforms: ['Sleeper', 'Yahoo Fantasy', 'ESPN', 'Fantrax'],
      formats: ['Redraft', 'Dynasty', 'Best Ball', 'Keeper', 'Guillotine', 'IDP', 'More'],
    },
    outcomes: {
      title: 'Real Insights. Real Results.',
      cards: [
        { title: 'Healthier Leagues', body: 'Improve retention and keep leagues active.' },
        { title: 'Save Time', body: 'Automate routine commissioner work.' },
        { title: 'Engage Managers', body: 'Understand behavior and increase participation.' },
        { title: 'Make Better Decisions', body: 'Use real data to guide league actions.' },
      ],
    },
    licensing: {
      title: 'License the AllFantasy Intelligence',
      body: 'Embed League, User, and Platform Intelligence into your product with SDKs, APIs, and white-label dashboards.',
      cards: [
        { title: 'White Label', body: 'Your brand, our intelligence engine.' },
        { title: 'SDK & API', body: 'Drop-in widgets and programmatic access.' },
        { title: 'Custom Dashboards', body: 'Purpose-built views for your team.' },
      ],
      cta: 'Talk to Partnerships',
    },
    footerTrust: ['Fantasy Sports Only', 'No Betting', 'Built by Commissioners', 'Your Data Is Yours', 'Free to Get Started'],
    footer: {
      privacy: 'Privacy',
      terms: 'Terms',
      dataDeletion: 'Data Deletion',
      signIn: 'Sign In',
      admin: 'Admin',
      geoNote:
        'Not available in WA. Paid leagues restricted in HI, ID, MT, NV. AllFantasy is 100% fantasy sports — no gambling, no sportsbook.',
    },
  },
  es: {
    nav: {
      brand: 'AllFantasy',
      products: 'Productos',
      solutions: 'Soluciones',
      resources: 'Recursos',
      pricing: 'Precios',
      company: 'Empresa',
      signIn: 'Iniciar sesión',
      signUp: 'Comenzar gratis',
      dashboard: 'Panel',
      admin: 'Admin',
      ariaHome: 'Inicio de AllFantasy',
      ariaFooterNav: 'Navegación del pie de página',
    },
    hero: {
      headlinePrefix: 'La ',
      headlineGradient: 'plataforma de inteligencia',
      headlineSuffix: ' para el fantasy deportivo.',
      subtitle:
        'AllFantasy convierte datos reales de ligas y usuarios en mejores decisiones para jugadores, comisionados y plataformas de fantasy.',
      primary: 'Comenzar gratis',
      secondary: 'Ver resumen',
      alreadyHaveAccount: '¿Ya tienes cuenta? Inicia sesión',
      primaryAuthed: 'Ir al panel',
      reassurance: 'Gratis para jugadores · Comisionados desde $4.99/mes · Cancela cuando quieras',
      trust: ['Solo fantasy deportivo', 'Sin apuestas', 'Seguro y privado', 'Comisionados primero', 'Gratis para jugadores'],
      preview: {
        title: 'Pulso de liga',
        leagueHealthLabel: 'Salud de la liga',
        leagueHealthValue: '91',
        retentionLabel: 'Pronóstico de retención',
        retentionValue: '94%',
        activityLabel: 'Tendencia de actividad',
        topRiskLabel: 'Riesgo principal',
        topRiskValue: '3 dueños inactivos',
      },
    },
    products: {
      eyebrow: 'Cuatro productos',
      title: 'Cuatro productos. Hechos para cada rol.',
      subtitle: 'Elige el producto que se ajuste a ti. O úsalos juntos.',
      cards: [
        {
          key: 'app',
          color: 'blue',
          icon: 'layers',
          title: 'Aplicación de Fantasy Deportivo',
          tagline: 'Juega. Compite. Gana.',
          description: 'Todo lo que necesitas para dirigir y ganar tus ligas de fantasy.',
          bullets: ['Puntuación y partidos en vivo', 'Drafts, waivers y trades', 'Rosters y alineaciones', 'Chat, actividad y notificaciones'],
          cta: 'Entrar a la app',
          href: '/dashboard',
        },
        {
          key: 'league-intel',
          color: 'green',
          icon: 'trending',
          title: 'League Intelligence OS',
          tagline: 'Haz crecer ligas más saludables.',
          description: 'Herramientas para comisionados y operadores que mejoran retención, participación y rendimiento de la liga.',
          bullets: ['Salud y retención de liga', 'Balance competitivo', 'Automatización y alertas', 'Reportes y comparativas'],
          cta: 'Explorar League Intelligence',
          href: '/commissioner-hub',
        },
        {
          key: 'user-intel',
          color: 'purple',
          icon: 'users',
          title: 'User Intelligence',
          tagline: 'Entiende a cada manager.',
          description: 'Información de comportamiento y participación que ayuda a las plataformas a entender y retener usuarios.',
          bullets: ['Perfil y ADN del manager', 'Puntuación de participación', 'Análisis de tendencias', 'Segmentación e insights'],
          cta: 'Ver User Intelligence',
          href: '/commissioner-hub',
        },
        {
          key: 'platform-intel',
          color: 'orange',
          icon: 'building',
          title: 'Platform Intelligence',
          tagline: 'Impulsa el fantasy a gran escala.',
          description: 'APIs, SDKs, paneles e inteligencia de marca blanca para plataformas y socios de fantasy.',
          bullets: ['Inteligencia de marca blanca', 'Acceso a SDK y API', 'Paneles personalizados', 'Soporte empresarial'],
          cta: 'Sé nuestro socio',
          href: 'mailto:support@allfantasy.ai?subject=Partnerships%20Inquiry',
        },
      ],
    },
    dfs: {
      eyebrow: 'Futuras verticales de inteligencia',
      body:
        'El mismo marco de inteligencia puede respaldar DFS, pick’em, análisis relacionados con casas de apuestas y herramientas de riesgo para socios, donde sea legalmente permitido y aprobado por cumplimiento.',
    },
    trustedStrip: {
      title: 'La confianza de los comisionados. Hecho para cada formato.',
      compatLabel: 'Compatible con',
      platforms: ['Sleeper', 'Yahoo Fantasy', 'ESPN', 'Fantrax'],
      formats: ['Redraft', 'Dynasty', 'Best Ball', 'Keeper', 'Guillotine', 'IDP', 'Más'],
    },
    outcomes: {
      title: 'Información real. Resultados reales.',
      cards: [
        { title: 'Ligas más saludables', body: 'Mejora la retención y mantén las ligas activas.' },
        { title: 'Ahorra tiempo', body: 'Automatiza el trabajo rutinario del comisionado.' },
        { title: 'Involucra a los managers', body: 'Entiende el comportamiento y aumenta la participación.' },
        { title: 'Toma mejores decisiones', body: 'Usa datos reales para guiar las acciones de la liga.' },
      ],
    },
    licensing: {
      title: 'Licencia la inteligencia de AllFantasy',
      body: 'Integra League, User y Platform Intelligence en tu producto con SDKs, APIs y paneles de marca blanca.',
      cards: [
        { title: 'Marca blanca', body: 'Tu marca, nuestro motor de inteligencia.' },
        { title: 'SDK y API', body: 'Widgets listos y acceso programático.' },
        { title: 'Paneles personalizados', body: 'Vistas diseñadas para tu equipo.' },
      ],
      cta: 'Habla con Partnerships',
    },
    footerTrust: ['Solo fantasy deportivo', 'Sin apuestas', 'Hecho por comisionados', 'Tus datos son tuyos', 'Gratis para empezar'],
    footer: {
      privacy: 'Privacidad',
      terms: 'Términos',
      dataDeletion: 'Eliminar datos',
      signIn: 'Iniciar sesión',
      admin: 'Admin',
      geoNote:
        'No disponible en WA. Ligas de pago restringidas en HI, ID, MT, NV. AllFantasy es 100% fantasy deportivo — sin apuestas, sin casas de apuestas.',
    },
  },
  zh: {
    nav: {
      brand: 'AllFantasy',
      products: '产品',
      solutions: '解决方案',
      resources: '资源',
      pricing: '价格',
      company: '公司',
      signIn: '登录',
      signUp: '免费开始',
      dashboard: '控制台',
      admin: '管理员',
      ariaHome: 'AllFantasy 主页',
      ariaFooterNav: '页脚导航',
    },
    hero: {
      headlinePrefix: '幻想体育的',
      headlineGradient: '智能平台',
      headlineSuffix: '。',
      subtitle: 'AllFantasy 将真实的联赛和用户数据转化为玩家、赛区长和幻想平台的更优决策。',
      primary: '免费开始',
      secondary: '观看概览',
      alreadyHaveAccount: '已有账户？登录',
      primaryAuthed: '前往控制台',
      reassurance: '玩家免费 · 赛区长 $4.99/月起 · 随时取消',
      trust: ['仅限幻想运动', '无赌博', '安全私密', '赛区长优先', '玩家免费'],
      preview: {
        title: '联赛脉搏',
        leagueHealthLabel: '联赛健康度',
        leagueHealthValue: '91',
        retentionLabel: '留存预测',
        retentionValue: '94%',
        activityLabel: '活跃度趋势',
        topRiskLabel: '主要风险',
        topRiskValue: '3 位不活跃管理员',
      },
    },
    products: {
      eyebrow: '四款产品',
      title: '四款产品，服务每个角色。',
      subtitle: '选择适合你的产品，或一起使用。',
      cards: [
        {
          key: 'app',
          color: 'blue',
          icon: 'layers',
          title: '幻想体育应用',
          tagline: '游戏。竞争。获胜。',
          description: '运营并赢得你的幻想联赛所需的一切。',
          bullets: ['实时计分与对阵', '选秀、废员与交易', '名单与阵容管理', '聊天、动态与通知'],
          cta: '进入幻想应用',
          href: '/dashboard',
        },
        {
          key: 'league-intel',
          color: 'green',
          icon: 'trending',
          title: 'League Intelligence OS',
          tagline: '打造更健康的联赛。',
          description: '帮助赛区长和运营者提升留存、参与度和联赛表现的工具。',
          bullets: ['联赛健康与留存', '竞争平衡', '自动化与提醒', '报告与基准对比'],
          cta: '探索联赛智能',
          href: '/commissioner-hub',
        },
        {
          key: 'user-intel',
          color: 'purple',
          icon: 'users',
          title: 'User Intelligence',
          tagline: '了解每一位管理员。',
          description: '帮助平台理解并留住用户的行为与参与度洞察。',
          bullets: ['管理员画像', '参与度评分', '行为趋势分析', '分群与洞察'],
          cta: '查看用户智能',
          href: '/commissioner-hub',
        },
        {
          key: 'platform-intel',
          color: 'orange',
          icon: 'building',
          title: 'Platform Intelligence',
          tagline: '大规模驱动幻想体育。',
          description: '面向幻想平台与合作伙伴的 API、SDK、仪表盘与白标智能。',
          bullets: ['白标智能', 'SDK 与 API 访问', '定制仪表盘', '企业级支持'],
          cta: '与我们合作',
          href: 'mailto:support@allfantasy.ai?subject=Partnerships%20Inquiry',
        },
      ],
    },
    dfs: {
      eyebrow: '未来智能领域',
      body: '在法律允许并通过合规审批的情况下，同一套智能框架可支持每日幻想体育（DFS）、竞猜、体育博彩相关分析以及合作伙伴风险工具。',
    },
    trustedStrip: {
      title: '深受赛区长信赖，适配每种赛制。',
      compatLabel: '兼容',
      platforms: ['Sleeper', 'Yahoo Fantasy', 'ESPN', 'Fantrax'],
      formats: ['Redraft', 'Dynasty', 'Best Ball', 'Keeper', 'Guillotine', 'IDP', '更多'],
    },
    outcomes: {
      title: '真实洞察。真实成果。',
      cards: [
        { title: '更健康的联赛', body: '提升留存率，保持联赛活跃。' },
        { title: '节省时间', body: '自动化常规赛区长工作。' },
        { title: '提升管理员参与', body: '理解行为，提高参与度。' },
        { title: '做出更好的决策', body: '用真实数据指导联赛决策。' },
      ],
    },
    licensing: {
      title: '授权使用 AllFantasy 智能',
      body: '通过 SDK、API 和白标仪表盘，将 League、User 和 Platform Intelligence 嵌入你的产品。',
      cards: [
        { title: '白标', body: '你的品牌，我们的智能引擎。' },
        { title: 'SDK 与 API', body: '即插即用组件与编程访问。' },
        { title: '定制仪表盘', body: '为你的团队量身打造的视图。' },
      ],
      cta: '联系合作伙伴团队',
    },
    footerTrust: ['仅限幻想运动', '无投注', '由赛区长打造', '你的数据属于你', '免费开始'],
    footer: {
      privacy: '隐私',
      terms: '条款',
      dataDeletion: '数据删除',
      signIn: '登录',
      admin: '管理员',
      geoNote: '在 WA 州不可用。HI、ID、MT、NV 州限制付费联赛。AllFantasy 100% 专注幻想体育 — 无赌博，无体育博彩。',
    },
  },
} as const

type LandingLocale = keyof typeof LANDING_COPY
const LOCALE_FALLBACK_ORDER: LandingLocale[] = ['en']

function resolveCopy(language: string) {
  if (language in LANDING_COPY) return LANDING_COPY[language as LandingLocale]
  return LANDING_COPY[LOCALE_FALLBACK_ORDER[0]]
}

// fil/vi intentionally fall back to English above — this page's own copy set predates
// full fil/vi marketing translations; the app-wide `t()` dictionary already labels those
// two "Beta" elsewhere, so an English landing page for them is consistent, not a bug.

const PRODUCT_ICONS = { layers: Layers, trending: TrendingUp, users: Users, building: Building2 } as const

const PRODUCT_COLOR_VARS: Record<string, { solid: string; strong: string; soft: string }> = {
  blue: { solid: 'var(--color-primary)', strong: 'var(--color-primary-strong)', soft: 'var(--color-primary-soft)' },
  green: { solid: 'var(--accent-emerald)', strong: 'var(--accent-emerald-strong)', soft: 'var(--color-success-soft)' },
  purple: { solid: 'var(--accent-purple)', strong: 'var(--color-secondary)', soft: 'var(--color-secondary-soft)' },
  orange: { solid: 'var(--accent-amber)', strong: 'var(--accent-amber-strong)', soft: 'var(--color-warning-soft)' },
}

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

type LandingPageClientProps = {
  initialSession?: Session | null
}

export default function LandingPageClient({
  initialSession = null,
}: LandingPageClientProps) {
  const { language } = useOptionalLanguage()
  const { status } = useOptionalSession()
  const copy = resolveCopy(language)
  const isAuthenticated =
    status === 'unauthenticated'
      ? false
      : status === 'authenticated'
        ? true
        : Boolean(initialSession?.user)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      setIsAdmin(false)
      return
    }
    let cancelled = false
    fetch('/api/user/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.isAdmin) setIsAdmin(true)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isAuthenticated])

  const signupHref = signupUrlWithIntent('/dashboard')
  const loginHref = loginUrlWithIntent('/dashboard')
  const dashboardHref = '/dashboard'

  return (
    <main className="mode-readable min-h-screen overflow-x-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ─── NAV ─── */}
      <header
        className="fixed inset-x-0 top-0 z-50 border-b"
        style={{
          borderColor: 'var(--border)',
          background: 'color-mix(in srgb, var(--bg) 86%, transparent)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }}
      >
        <div className="mx-auto flex h-[56px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 px-1 py-1 transition-opacity hover:opacity-80"
            aria-label={copy.nav.ariaHome}
            data-testid="landing-logo-link"
          >
            <Image
              src="/brand/allfantasy-wordmark-transparent.png"
              alt="AllFantasy wordmark"
              width={1198}
              height={306}
              priority
              className="nav-logo-img h-[30px] w-auto object-contain sm:h-[38px]"
            />
          </Link>

          <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
            <Link href="#products" className="text-sm font-medium transition hover:opacity-100" style={{ color: 'var(--muted)' }}>
              {copy.nav.products}
            </Link>
            <Link href="#outcomes" className="text-sm font-medium transition hover:opacity-100" style={{ color: 'var(--muted)' }}>
              {copy.nav.solutions}
            </Link>
            <Link href="#licensing" className="text-sm font-medium transition hover:opacity-100" style={{ color: 'var(--muted)' }}>
              {copy.nav.resources}
            </Link>
            <Link href="/pricing" className="text-sm font-medium transition hover:opacity-100" style={{ color: 'var(--muted)' }}>
              {copy.nav.pricing}
            </Link>
            <Link href="#footer" className="text-sm font-medium transition hover:opacity-100" style={{ color: 'var(--muted)' }}>
              {copy.nav.company}
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex">
              <LanguageToggle />
            </div>
            <div className="hidden md:flex">
              <ThemeModeSelect size="sm" />
            </div>
            {isAdmin && (
              <Link
                href="/admin"
                className="hidden rounded-lg border px-3 py-1.5 text-xs font-medium transition sm:inline-flex"
                style={{ borderColor: 'color-mix(in srgb, var(--border) 75%, transparent)', color: 'var(--muted)', background: 'transparent' }}
              >
                <Shield className="mr-1 h-3.5 w-3.5" />
                {copy.nav.admin}
              </Link>
            )}
            {!isAuthenticated ? (
              <>
                <Link
                  href={loginHref}
                  className="inline-flex rounded-lg border px-3 py-2 text-sm font-medium transition hover:opacity-90"
                  style={{ borderColor: 'color-mix(in srgb, var(--border) 100%, transparent)', color: 'var(--muted)', background: 'color-mix(in srgb, var(--panel2) 40%, transparent)' }}
                  data-testid="landing-nav-sign-in"
                  onClick={() => trackLandingCtaClick({ cta_label: copy.nav.signIn, cta_destination: loginHref, cta_type: 'secondary', source: 'nav' })}
                >
                  {copy.nav.signIn}
                </Link>
                <Link
                  href={signupHref}
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                  style={{ backgroundImage: 'linear-gradient(90deg, var(--color-primary), var(--color-primary-strong))', color: 'var(--on-accent-bg)' }}
                  data-testid="landing-nav-sign-up"
                  onClick={() => trackLandingCtaClick({ cta_label: copy.nav.signUp, cta_destination: signupHref, cta_type: 'primary', source: 'nav' })}
                >
                  {copy.nav.signUp}
                </Link>
              </>
            ) : (
              <Link
                href={dashboardHref}
                className="inline-flex rounded-lg border px-3 py-2 text-sm font-medium transition hover:opacity-90"
                style={{ borderColor: 'color-mix(in srgb, var(--border) 100%, transparent)', color: 'var(--muted)', background: 'transparent' }}
                data-testid="landing-nav-dashboard"
                onClick={() => trackLandingCtaClick({ cta_label: copy.nav.dashboard, cta_destination: dashboardHref, cta_type: 'secondary', source: 'nav' })}
              >
                {copy.nav.dashboard}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 55% 50% at 30% 30%, color-mix(in srgb, var(--color-primary) 14%, transparent) 0%, transparent 65%),
              radial-gradient(ellipse 45% 40% at 80% 20%, color-mix(in srgb, var(--accent-emerald) 10%, transparent) 0%, transparent 65%)
            `,
          }}
          aria-hidden="true"
        />
        <div className="landing-grid pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          {/* left: headline / copy / CTAs */}
          <div className="text-center lg:text-left">
            <h1
              className="mx-auto mb-5 max-w-2xl text-[34px] font-black leading-[1.05] tracking-[0.01em] sm:text-[48px] md:text-[56px] lg:mx-0"
              style={{ color: 'var(--text)' }}
              data-testid="landing-hero-headline"
            >
              {copy.hero.headlinePrefix}
              <GradientWord>{copy.hero.headlineGradient}</GradientWord>
              {copy.hero.headlineSuffix}
            </h1>
            <p
              className="mx-auto mb-8 max-w-xl text-sm leading-6 sm:text-base sm:leading-7 lg:mx-0"
              style={{ color: 'var(--muted)' }}
            >
              {copy.hero.subtitle}
            </p>

            <div className="mb-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start" data-testid="landing-hero-cta-group">
              {isAuthenticated ? (
                <Link
                  href={dashboardHref}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold transition hover:-translate-y-0.5 hover:opacity-90 sm:w-auto"
                  style={{ backgroundImage: 'linear-gradient(90deg, var(--color-primary), var(--color-primary-strong))', color: 'var(--on-accent-bg)' }}
                  data-testid="landing-open-app-button"
                  onClick={() => trackLandingCtaClick({ cta_label: copy.hero.primaryAuthed, cta_destination: dashboardHref, cta_type: 'primary', source: 'hero' })}
                >
                  {copy.hero.primaryAuthed}
                </Link>
              ) : (
                <>
                  <Link
                    href={signupHref}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold transition hover:-translate-y-0.5 hover:opacity-90 sm:w-auto"
                    style={{ backgroundImage: 'linear-gradient(90deg, var(--color-primary), var(--color-primary-strong))', color: 'var(--on-accent-bg)' }}
                    data-testid="landing-sign-up-button"
                    onClick={() => trackLandingCtaClick({ cta_label: copy.hero.primary, cta_destination: signupHref, cta_type: 'primary', source: 'hero' })}
                  >
                    {copy.hero.primary}
                  </Link>
                  <Link
                    href="#products"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-7 py-3.5 text-sm font-semibold transition hover:-translate-y-0.5 hover:opacity-90 sm:w-auto"
                    style={{ background: 'color-mix(in srgb, var(--panel) 88%, transparent)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    data-testid="landing-hero-watch-overview"
                    onClick={() => trackLandingCtaClick({ cta_label: copy.hero.secondary, cta_destination: '#products', cta_type: 'secondary', source: 'hero' })}
                  >
                    {copy.hero.secondary}
                  </Link>
                </>
              )}
            </div>

            {!isAuthenticated && (
              <>
                <Link
                  href={loginHref}
                  className="mb-4 block text-center text-sm font-medium underline underline-offset-4 transition hover:opacity-90 lg:text-left"
                  style={{ color: 'var(--color-primary)' }}
                  data-testid="landing-hero-sign-in"
                  onClick={() => trackLandingCtaClick({ cta_label: copy.hero.alreadyHaveAccount, cta_destination: loginHref, cta_type: 'secondary', source: 'hero' })}
                >
                  {copy.hero.alreadyHaveAccount}
                </Link>
                <p className="mb-6 text-center text-[11px] lg:text-left" style={{ color: 'var(--muted)' }}>
                  {copy.hero.reassurance}
                </p>
              </>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start" data-testid="landing-hero-trust-badges">
              {copy.hero.trust.map((label) => (
                <span
                  key={label}
                  className="rounded-full border px-3 py-1 text-[11px] font-semibold"
                  style={{ background: 'color-mix(in srgb, var(--panel2) 78%, transparent)', borderColor: 'var(--border)', color: 'var(--muted)' }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* right: small League Pulse preview widget */}
          <div className="relative mx-auto w-full max-w-md lg:mx-0" aria-hidden="true">
            <div
              className="card-premium overflow-hidden rounded-2xl border p-5"
              style={{ borderColor: 'var(--border)', background: 'var(--panel)', boxShadow: 'var(--shadow-card)' }}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--muted)' }}>
                  {copy.hero.preview.title}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: 'var(--color-success-soft)', color: 'var(--accent-emerald-strong)' }}
                >
                  {copy.hero.preview.leagueHealthValue}
                </span>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel2) 70%, transparent)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                    {copy.hero.preview.leagueHealthLabel}
                  </p>
                  <p className="mt-1 text-xl font-black" style={{ color: 'var(--text)' }}>{copy.hero.preview.leagueHealthValue}</p>
                </div>
                <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel2) 70%, transparent)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                    {copy.hero.preview.retentionLabel}
                  </p>
                  <p className="mt-1 text-xl font-black" style={{ color: 'var(--text)' }}>{copy.hero.preview.retentionValue}</p>
                </div>
              </div>
              <div className="mb-4 rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel2) 70%, transparent)' }}>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  {copy.hero.preview.activityLabel}
                </p>
                <svg viewBox="0 0 200 44" className="h-10 w-full" preserveAspectRatio="none">
                  <polyline
                    points="0,36 25,30 50,32 75,20 100,24 125,12 150,16 175,6 200,10"
                    fill="none"
                    stroke="var(--accent-emerald)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3" style={{ borderColor: 'color-mix(in srgb, var(--color-warning) 30%, var(--border))', background: 'var(--color-warning-soft)' }}>
                <span className="text-[11px] font-semibold" style={{ color: 'var(--accent-amber-strong)' }}>
                  {copy.hero.preview.topRiskLabel}
                </span>
                <span className="text-[11px] font-semibold" style={{ color: 'var(--accent-amber-strong)' }}>
                  {copy.hero.preview.topRiskValue}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRODUCTS ─── */}
      <section id="products" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="landing-products-heading">
        <div className="mb-10 text-center">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--color-primary)' }}>
            {copy.products.eyebrow}
          </p>
          <h2 id="landing-products-heading" className="mb-3 text-[26px] font-black leading-tight sm:text-[36px]" style={{ color: 'var(--text)' }}>
            {copy.products.title}
          </h2>
          <p className="mx-auto max-w-xl text-sm sm:text-base" style={{ color: 'var(--muted)' }}>
            {copy.products.subtitle}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {copy.products.cards.map((card) => {
            const Icon = PRODUCT_ICONS[card.icon as keyof typeof PRODUCT_ICONS]
            const colorVars = PRODUCT_COLOR_VARS[card.color] ?? PRODUCT_COLOR_VARS.blue
            return (
              <article
                key={card.key}
                className="flex flex-col rounded-2xl border p-5"
                style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
              >
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: colorVars.soft, color: colorVars.solid }}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text)' }}>{card.title}</h3>
                <p className="mt-0.5 text-[13px] font-semibold" style={{ color: colorVars.strong }}>{card.tagline}</p>
                <p className="mt-2.5 text-[13px] leading-5" style={{ color: 'var(--muted)' }}>{card.description}</p>
                <ul className="mt-4 flex-1 space-y-1.5">
                  {card.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-[12px] leading-5" style={{ color: 'var(--muted)' }}>
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: colorVars.solid }} />
                      {bullet}
                    </li>
                  ))}
                </ul>
                <Link
                  href={card.href}
                  className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-[13px] font-semibold transition hover:opacity-85"
                  style={{ borderColor: colorVars.solid, color: colorVars.solid }}
                  data-testid={`landing-product-cta-${card.key}`}
                  onClick={() => trackLandingCtaClick({ cta_label: card.cta, cta_destination: card.href, cta_type: 'secondary', source: `product-${card.key}` })}
                >
                  {card.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            )
          })}
        </div>

        {/* Future intelligence verticals — partner/compliance-facing only, never a consumer gambling pitch */}
        <div
          className="mt-8 rounded-2xl border p-5 text-center sm:p-6"
          style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel2) 60%, transparent)' }}
        >
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--muted)' }}>
            {copy.dfs.eyebrow}
          </p>
          <p className="mx-auto max-w-2xl text-[12px] leading-5" style={{ color: 'var(--muted)' }}>
            {copy.dfs.body}
          </p>
        </div>
      </section>

      {/* ─── TRUSTED / SUPPORTED ─── */}
      <section className="border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-5xl px-4 py-10 text-center sm:px-6">
          <p className="mb-5 text-sm font-semibold" style={{ color: 'var(--text)' }}>{copy.trustedStrip.title}</p>
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--muted)' }}>
              {copy.trustedStrip.compatLabel}
            </span>
            {copy.trustedStrip.platforms.map((name) => (
              <span
                key={name}
                className="rounded-full border px-3 py-1 text-[12px] font-semibold"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                {name}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {copy.trustedStrip.formats.map((name) => (
              <span
                key={name}
                className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{ background: 'color-mix(in srgb, var(--panel2) 70%, transparent)', color: 'var(--muted)' }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── OUTCOMES ─── */}
      <section id="outcomes" className="border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="mb-8 text-center text-[24px] font-black sm:text-[32px]" style={{ color: 'var(--text)' }}>
            {copy.outcomes.title}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {copy.outcomes.cards.map((card) => (
              <div key={card.title} className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
                <h3 className="mb-1.5 text-sm font-bold" style={{ color: 'var(--text)' }}>{card.title}</h3>
                <p className="text-[13px] leading-5" style={{ color: 'var(--muted)' }}>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LICENSING ─── */}
      <section id="licensing" className="border-t" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="mb-3 text-[24px] font-black sm:text-[32px]" style={{ color: 'var(--text)' }}>{copy.licensing.title}</h2>
          <p className="mx-auto mb-8 max-w-xl text-sm sm:text-base" style={{ color: 'var(--muted)' }}>{copy.licensing.body}</p>
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            {copy.licensing.cards.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border p-5 text-left"
                style={{ borderColor: 'color-mix(in srgb, var(--accent-amber) 22%, var(--border))', background: 'var(--bg)' }}
              >
                <h3 className="mb-1.5 text-sm font-bold" style={{ color: 'var(--text)' }}>{card.title}</h3>
                <p className="text-[13px] leading-5" style={{ color: 'var(--muted)' }}>{card.body}</p>
              </div>
            ))}
          </div>
          <Link
            href="mailto:support@allfantasy.ai?subject=Licensing%20Inquiry"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:opacity-90"
            style={{ backgroundImage: 'linear-gradient(90deg, var(--accent-amber), var(--accent-amber-strong))', color: 'var(--on-accent-bg)' }}
            data-testid="landing-licensing-cta"
            onClick={() => trackLandingCtaClick({ cta_label: copy.licensing.cta, cta_destination: 'mailto:support@allfantasy.ai', cta_type: 'primary', source: 'licensing' })}
          >
            {copy.licensing.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ─── MOBILE STICKY CTA ─── */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-[#040915]/95 px-3 py-2 backdrop-blur sm:hidden"
        style={{ borderColor: 'var(--border)' }}
        data-testid="landing-mobile-sticky-cta"
      >
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <Link
            href={isAuthenticated ? dashboardHref : signupHref}
            prefetch={false}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white"
            data-testid="landing-mobile-open-app-button"
            onClick={() =>
              trackLandingCtaClick({
                cta_label: isAuthenticated ? copy.hero.primaryAuthed : copy.hero.primary,
                cta_destination: isAuthenticated ? dashboardHref : signupHref,
                cta_type: 'primary',
                source: 'mobile_sticky',
              })
            }
          >
            {isAuthenticated ? copy.hero.primaryAuthed : copy.hero.primary}
          </Link>
          {!isAuthenticated && (
            <Link
              href={loginHref}
              prefetch={false}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85"
              data-testid="landing-mobile-sign-in-button"
              onClick={() =>
                trackLandingCtaClick({
                  cta_label: copy.nav.signIn,
                  cta_destination: loginHref,
                  cta_type: 'secondary',
                  source: 'mobile_sticky',
                })
              }
            >
              {copy.nav.signIn}
            </Link>
          )}
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <footer id="footer" className="border-t px-4 py-8 pb-20 sm:px-6 sm:pb-8" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-b pb-5" style={{ borderColor: 'var(--border)' }} data-testid="landing-footer-trust-bar">
            {copy.footerTrust.map((label) => (
              <span key={label} className="text-[12px] font-semibold" style={{ color: 'var(--muted)' }}>
                {label}
              </span>
            ))}
          </div>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <Link href="/" className="flex items-center gap-3 opacity-80 transition-opacity hover:opacity-100" aria-label={copy.nav.ariaHome}>
              <Image
                src="/brand/allfantasy-wordmark-transparent.png"
                alt="AllFantasy wordmark"
                width={1198}
                height={306}
                className="nav-wordmark footer-logo h-[26px] w-auto object-contain"
              />
              <span className="text-sm" style={{ color: 'var(--muted2)' }}>
                © {new Date().getFullYear()} AllFantasy.ai
              </span>
            </Link>
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label={copy.nav.ariaFooterNav}>
              <Link href="/privacy" className="text-sm transition-colors [color:var(--muted)] hover:[color:var(--text)]">{copy.footer.privacy}</Link>
              <Link href="/terms" className="text-sm transition-colors [color:var(--muted)] hover:[color:var(--text)]">{copy.footer.terms}</Link>
              <Link href="/data-deletion" className="text-sm transition-colors [color:var(--muted)] hover:[color:var(--text)]">{copy.footer.dataDeletion}</Link>
              <Link href={loginHref} className="text-sm transition-colors [color:var(--muted)] hover:[color:var(--text)]">{copy.footer.signIn}</Link>
              <Link href="/admin" className="text-sm transition-colors [color:var(--muted)] hover:[color:var(--text)]">{copy.footer.admin}</Link>
            </nav>
          </div>
          {/* Language + theme toggles — visible on all screen sizes (nav toggles are desktop-only) */}
          <div className="mt-4 flex flex-wrap items-center gap-3 md:hidden">
            <LanguageToggle />
            <ThemeModeSelect size="sm" />
          </div>
          <p className="mt-4 max-w-3xl text-[11px] leading-5" style={{ color: 'var(--muted2)' }}>
            {copy.footer.geoNote}
          </p>
        </div>
      </footer>

      <style jsx>{`
        .landing-grid {
          background-image:
            linear-gradient(color-mix(in srgb, var(--border) 40%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in srgb, var(--border) 40%, transparent) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 75% 75% at 50% 50%, black 20%, transparent 78%);
        }
      `}</style>
    </main>
  )
}
