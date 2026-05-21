'use client'

import type { ReactNode } from 'react'
import type { Session } from 'next-auth'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useOptionalSession } from '@/components/auth/useOptionalSession'
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
      signUp: 'Get Started →',
      dashboard: 'Dashboard',
      admin: 'Admin',
      forCommissioners: '★ For Commissioners',
      ariaHome: 'AllFantasy home',
      ariaSports: 'Supported sports',
      ariaFooterNav: 'Footer navigation',
    },
    badge: '✦ Fantasy Sports Only · No Gambling · Free for Players',
    hero: {
      titleTop: 'Run Your League.',
      titleBottom: 'Win Your League.',
      subtitle:
        'Commissioner-first. AI-powered. 100% fantasy sports — no sportsbook, no gambling. Import any league format and get every manager competing in minutes.',
      primary: 'Get Started Free →',
      commissionerPrimary: 'Start a League',
      secondary: 'Sign In',
      alreadyHaveAccount: 'Already have an account? Sign in',
      primaryAuthed: 'Go to Dashboard →',
      reassurance: 'Free for players · Commissioners from $4.99/mo · Cancel anytime',
    },
    sports: ['NFL', 'NBA', 'NHL', 'MLB', 'NCAA', 'Soccer'],
    trust: [
      { icon: '🚫', text: 'No gambling · fantasy sports only' },
      { icon: '⚡', text: '13+ league formats' },
      { icon: '📡', text: 'Import from Sleeper, Yahoo & ESPN' },
      { icon: '🤖', text: 'AI optional — fun either way' },
    ],
    commissioner: {
      eyebrow: 'For Commissioners',
      title: 'The Control Room\nYour League Deserves.',
      subtitle:
        'Run any league format from day one. Dispersal drafts, integrity monitoring, broadcast tools — all in one place. Your managers focus on winning; you run the show.',
      badge: 'AF Commissioner',
      badgeBody: 'One subscription covers every league you run. Cancel anytime.',
      features: [
        {
          icon: '🏈',
          title: 'Dispersal Draft',
          body: 'Managers leave? Pool their assets and run a live draft — automatically.',
        },
        {
          icon: '🔍',
          title: 'Integrity Monitoring',
          body: 'AI watches every trade for collusion. Opt-in anti-tanking keeps competition real.',
        },
        {
          icon: '🎱',
          title: 'Weighted Lottery',
          body: 'NBA-style draft order for dynasty leagues. Kills tanking without killing excitement.',
        },
        {
          icon: '📡',
          title: 'League Broadcast',
          body: 'Send announcements, polls, and events to all your leagues at once.',
        },
      ],
      cta: 'Start as Commissioner',
      ctaHref: '/signup?role=commissioner',
      secondaryCta: 'View Commissioner Plans',
      secondaryCtaHref: '/commissioner-upgrade?highlight=dispersal_draft',
    },
    tools: {
      eyebrow: 'AI Tools — Optional, But Powerful',
      titleTop: 'Play Your Way.',
      titleBottom: 'AI When You Want It.',
      subtitle:
        "Every manager gets AI tools built around your league's scoring, roster, and matchup context. Use them to get an edge — or don't. Either way, it's a great season.",
      cards: [
        {
          icon: '⚖️',
          title: 'Trade Analyzer',
          body: 'AI fairness scores, value deltas, and lineup impact — before you accept or reject any deal.',
          previewTitle: 'Example output',
          previewLines: ['Fairness score: 92/100', 'Lineup swing: +11.8 pts', 'Verdict: accept'],
        },
        {
          icon: '🎯',
          title: 'Draft Assistant',
          body: 'Live draft help with tier awareness, ADP tracking, and need-based pivot suggestions.',
          previewTitle: 'Live draft cue',
          previewLines: ['Tier break in 2 picks', 'Best value: DeVonta Smith', 'Pivot if RB run continues'],
        },
        {
          icon: '🧠',
          title: 'Chimmy AI Coach',
          body: "Ask anything. Chimmy knows your roster, your opponents, and what matters this week.",
          previewTitle: 'Example response',
          previewLines: ['Start Nico Collins over Pittman.', 'You need ceiling this week.', 'Opponent is weak vs outside WRs.'],
        },
      ],
      previewLabel: 'Example output',
      optionalNote: 'AI is optional — you can draft, trade, and win without ever touching a single AI tool.',
    },
    stats: [
      { value: '13+', label: 'League formats' },
      { value: '7', label: 'Sports covered' },
      { value: '1M+', label: 'AI analyses run' },
    ],
    cta: {
      title: 'Your League. Your Rules.',
      body:
        "Commissioners get a dedicated control room. Players get AI that knows their roster. Everyone wins.",
      primary: 'Create Free Account',
      commissionerPrimary: 'Start a League',
      secondary: 'Sign In',
      primaryAuthed: 'Open App',
      secondaryAuthed: 'Dashboard',
      commissionerNote: 'No gambling. Fantasy sports and brackets only. Free for players.',
    },
    footer: {
      privacy: 'Privacy',
      terms: 'Terms',
      dataDeletion: 'Data Deletion',
      openApp: 'Open App',
      signIn: 'Sign In',
      admin: 'Admin',
      geoNote: 'Not available in WA. Paid leagues restricted in HI, ID, MT, NV. AllFantasy is 100% fantasy sports — no gambling, no sportsbook.',
    },
  },
  es: {
    nav: {
      brand: 'AllFantasy',
      signIn: 'Iniciar sesión',
      signUp: 'Comenzar →',
      dashboard: 'Panel',
      admin: 'Admin',
      forCommissioners: '★ Para comisionados',
      ariaHome: 'Inicio de AllFantasy',
      ariaSports: 'Deportes disponibles',
      ariaFooterNav: 'Navegación del pie de página',
    },
    badge: '✦ Solo Fantasy Deportivo · Sin Apuestas · Gratis para jugadores',
    hero: {
      titleTop: 'Dirige tu liga.',
      titleBottom: 'Gana tu liga.',
      subtitle:
        'Comisionado primero. IA integrada. 100% fantasy deportivo — sin apuestas ni casas de apuesta. Importa cualquier liga y empieza a competir en minutos.',
      primary: 'Empezar gratis →',
      commissionerPrimary: 'Crear una liga',
      secondary: 'Iniciar sesión',
      alreadyHaveAccount: '¿Ya tienes cuenta? Inicia sesión',
      primaryAuthed: 'Ir al panel →',
      reassurance: 'Gratis para jugadores · Comisionados desde $4.99/mes · Cancela cuando quieras',
    },
    sports: ['NFL', 'NBA', 'NHL', 'MLB', 'NCAA', 'Soccer'],
    trust: [
      { icon: '🚫', text: 'Sin apuestas · solo fantasy deportivo' },
      { icon: '⚡', text: '13+ formatos de liga' },
      { icon: '📡', text: 'Importa de Sleeper, Yahoo y ESPN' },
      { icon: '🤖', text: 'IA opcional — divertido de todas formas' },
    ],
    commissioner: {
      eyebrow: 'Para comisionados',
      title: 'La sala de control\nque tu liga merece.',
      subtitle:
        'Maneja cualquier formato de liga desde el primer día. Dispersal drafts, monitoreo de integridad y herramientas de broadcast — todo en un solo lugar.',
      badge: 'AF Commissioner',
      badgeBody: 'Una suscripción cubre todas las ligas que diriges. Cancela cuando quieras.',
      features: [
        {
          icon: '🏈',
          title: 'Dispersal draft',
          body: '¿Se van managers? Reúne sus activos y corre un draft en vivo — automático.',
        },
        {
          icon: '🔍',
          title: 'Monitoreo de integridad',
          body: 'La IA revisa cada trade en busca de colusión. Anti-tanking opcional mantiene la competencia real.',
        },
        {
          icon: '🎱',
          title: 'Lotería ponderada',
          body: 'Orden de draft estilo NBA para dynasty. Elimina el tank sin matar la emoción.',
        },
        {
          icon: '📡',
          title: 'Broadcast global',
          body: 'Anuncios, encuestas y eventos a todas tus ligas a la vez.',
        },
      ],
      cta: 'Empezar como comisionado',
      ctaHref: '/signup?role=commissioner',
      secondaryCta: 'Ver planes Commissioner',
      secondaryCtaHref: '/commissioner-upgrade?highlight=dispersal_draft',
    },
    tools: {
      eyebrow: 'Herramientas IA — Opcionales, pero poderosas',
      titleTop: 'Juega a tu manera.',
      titleBottom: 'IA cuando la quieras.',
      subtitle:
        'Cada manager obtiene herramientas de IA adaptadas a su liga, roster y contexto de puntuación. Úsalas para ganar ventaja — o no. De cualquier forma, es una gran temporada.',
      cards: [
        {
          icon: '⚖️',
          title: 'Trade Analyzer',
          body: 'Puntajes de equidad, delta de valor e impacto en tu lineup — antes de aceptar o rechazar cualquier trade.',
          previewTitle: 'Ejemplo',
          previewLines: ['Equidad: 92/100', 'Impacto: +11.8 pts', 'Veredicto: aceptar'],
        },
        {
          icon: '🎯',
          title: 'Draft Assistant',
          body: 'Ayuda en vivo con tiers, ADP y pivotes según necesidad.',
          previewTitle: 'Señal en draft',
          previewLines: ['Tier break en 2 picks', 'Mejor valor: DeVonta Smith', 'Pivota si sigue la corrida de RB'],
        },
        {
          icon: '🧠',
          title: 'Chimmy AI Coach',
          body: 'Pregunta lo que quieras. Chimmy conoce tu roster, tus rivales y lo que importa esta semana.',
          previewTitle: 'Respuesta ejemplo',
          previewLines: ['Inicia a Nico Collins sobre Pittman.', 'Necesitas techo esta semana.', 'Tu rival es débil contra WR abiertos.'],
        },
      ],
      previewLabel: 'Ejemplo',
      optionalNote: 'La IA es opcional — puedes draftear, tradear y ganar sin usar una sola herramienta de IA.',
    },
    stats: [
      { value: '13+', label: 'Formatos de liga' },
      { value: '7', label: 'Deportes cubiertos' },
      { value: '1M+', label: 'Análisis IA realizados' },
    ],
    cta: {
      title: 'Tu liga. Tus reglas.',
      body:
        'Los comisionados obtienen un panel de control. Los jugadores obtienen IA que conoce su roster. Todos ganan.',
      primary: 'Crear cuenta gratis',
      commissionerPrimary: 'Crear una liga',
      secondary: 'Iniciar sesión',
      primaryAuthed: 'Abrir app',
      secondaryAuthed: 'Panel',
      commissionerNote: 'Sin apuestas. Solo fantasy deportivo y brackets. Gratis para jugadores.',
    },
    footer: {
      privacy: 'Privacidad',
      terms: 'Términos',
      dataDeletion: 'Eliminar datos',
      openApp: 'Abrir app',
      signIn: 'Iniciar sesión',
      admin: 'Admin',
      geoNote: 'No disponible en WA. Ligas de pago restringidas en HI, ID, MT, NV. AllFantasy es 100% fantasy deportivo — sin apuestas.',
    },
  },
  zh: {
    nav: {
      brand: 'AllFantasy',
      signIn: '登录',
      signUp: '立即开始 →',
      dashboard: '控制台',
      admin: '管理员',
      forCommissioners: '★ 专为赛区长',
      ariaHome: 'AllFantasy 主页',
      ariaSports: '支持的运动',
      ariaFooterNav: '页脚导航',
    },
    badge: '✦ 仅限幻想运动 · 无赌博 · 玩家免费',
    hero: {
      titleTop: '管理你的联赛。',
      titleBottom: '赢得你的联赛。',
      subtitle:
        '赛区长优先。AI 驱动。100% 幻想运动 — 无体育博彩，无赌博。导入任何联赛格式，让每位管理员在几分钟内开始竞争。',
      primary: '免费开始 →',
      commissionerPrimary: '创建联赛',
      secondary: '登录',
      alreadyHaveAccount: '已有账户？登录',
      primaryAuthed: '前往控制台 →',
      reassurance: '玩家免费 · 赛区长 $4.99/月起 · 随时取消',
    },
    sports: ['NFL', 'NBA', 'NHL', 'MLB', 'NCAA', '足球'],
    trust: [
      { icon: '🚫', text: '无赌博 · 仅限幻想运动' },
      { icon: '⚡', text: '13+ 联赛格式' },
      { icon: '📡', text: '从 Sleeper、Yahoo 和 ESPN 导入' },
      { icon: '🤖', text: 'AI 可选 — 任何方式都很有趣' },
    ],
    commissioner: {
      eyebrow: '专为赛区长',
      title: '你的联赛\n值得拥有的控制室。',
      subtitle:
        '从第一天起管理任何联赛格式。分散草案、诚信监控、广播工具 — 全部集中在一处。让你的管理员专注于获胜，你来掌控全局。',
      badge: 'AF 赛区长',
      badgeBody: '一个订阅涵盖你运营的每个联赛。随时取消。',
      features: [
        {
          icon: '🏈',
          title: '分散草案',
          body: '管理员离开？合并他们的资产并进行现场草案 — 自动完成。',
        },
        {
          icon: '🔍',
          title: '诚信监控',
          body: 'AI 监控每笔交易以检测勾结。可选反躺平保持竞争真实性。',
        },
        {
          icon: '🎱',
          title: '加权抽签',
          body: 'NBA 风格的王朝联赛草案顺序。消除躺平而不失去刺激感。',
        },
        {
          icon: '📡',
          title: '联赛广播',
          body: '一次性向所有联赛发送公告、投票和活动。',
        },
      ],
      cta: '以赛区长身份开始',
      ctaHref: '/signup?role=commissioner',
      secondaryCta: '查看赛区长计划',
      secondaryCtaHref: '/commissioner-upgrade?highlight=dispersal_draft',
    },
    tools: {
      eyebrow: 'AI 工具 — 可选，但强大',
      titleTop: '按你的方式玩。',
      titleBottom: '需要时用 AI。',
      subtitle:
        '每位管理员都获得围绕联赛计分、名单和对阵情况构建的 AI 工具。用它们获得优势 — 或不用。无论如何，这都是一个精彩的赛季。',
      cards: [
        {
          icon: '⚖️',
          title: '交易分析器',
          body: 'AI 公平评分、价值差异和阵容影响 — 在接受或拒绝任何交易之前。',
          previewTitle: '示例输出',
          previewLines: ['公平分数：92/100', '阵容波动：+11.8 分', '裁定：接受'],
        },
        {
          icon: '🎯',
          title: '草案助手',
          body: '实时草案帮助，包括层级感知、ADP 跟踪和基于需求的转变建议。',
          previewTitle: '实时草案提示',
          previewLines: ['2 次选择后层级中断', '最佳价值：DeVonta Smith', '若 RB 连跑继续则转变'],
        },
        {
          icon: '🧠',
          title: 'Chimmy AI 教练',
          body: '随便问。Chimmy 了解你的名单、对手以及本周什么最重要。',
          previewTitle: '示例回应',
          previewLines: ['首发 Nico Collins 而非 Pittman。', '本周你需要上限。', '对手对外线 WR 较弱。'],
        },
      ],
      previewLabel: '示例输出',
      optionalNote: 'AI 是可选的 — 你可以在不使用任何 AI 工具的情况下进行草案、交易和获胜。',
    },
    stats: [
      { value: '13+', label: '联赛格式' },
      { value: '7', label: '覆盖运动' },
      { value: '1M+', label: 'AI 分析次数' },
    ],
    cta: {
      title: '你的联赛。你的规则。',
      body:
        '赛区长获得专属控制室。玩家获得了解其名单的 AI。人人受益。',
      primary: '创建免费账户',
      commissionerPrimary: '创建联赛',
      secondary: '登录',
      primaryAuthed: '打开应用',
      secondaryAuthed: '控制台',
      commissionerNote: '无赌博。仅限幻想运动和支架。玩家免费。',
    },
    footer: {
      privacy: '隐私',
      terms: '条款',
      dataDeletion: '删除数据',
      openApp: '打开应用',
      signIn: '登录',
      admin: '管理员',
      geoNote: '在 WA 不可用。在 HI、ID、MT、NV 限制付费联赛。AllFantasy 是 100% 幻想运动 — 无赌博。',
    },
  },
  fil: {
    nav: {
      brand: 'AllFantasy',
      signIn: 'Mag-sign In',
      signUp: 'Magsimula →',
      dashboard: 'Dashboard',
      admin: 'Admin',
      forCommissioners: '★ Para sa mga Commissioner',
      ariaHome: 'AllFantasy tahanan',
      ariaSports: 'Mga sinusuportahang palakasan',
      ariaFooterNav: 'Nabigasyon ng footer',
    },
    badge: '✦ Fantasy Sports Lamang · Walang Pagsusugal · Libre para sa mga Manlalaro',
    hero: {
      titleTop: 'Pamahalaan ang iyong liga.',
      titleBottom: 'Manalo sa iyong liga.',
      subtitle:
        'Commissioner-una. Pinapagana ng AI. 100% fantasy sports — walang sportsbook, walang pagsusugal. I-import ang anumang format ng liga at simulan ang kompetisyon sa loob ng ilang minuto.',
      primary: 'Magsimula nang Libre →',
      commissionerPrimary: 'Magsimula ng Liga',
      secondary: 'Mag-sign In',
      alreadyHaveAccount: 'May account na? Mag-sign in',
      primaryAuthed: 'Pumunta sa Dashboard →',
      reassurance: 'Libre para sa mga manlalaro · Commissioner mula $4.99/buwan · Kanselahin anumang oras',
    },
    sports: ['NFL', 'NBA', 'NHL', 'MLB', 'NCAA', 'Soccer'],
    trust: [
      { icon: '🚫', text: 'Walang pagsusugal · fantasy sports lamang' },
      { icon: '⚡', text: '13+ na format ng liga' },
      { icon: '📡', text: 'I-import mula sa Sleeper, Yahoo at ESPN' },
      { icon: '🤖', text: 'AI opsyonal — masaya sa alinmang paraan' },
    ],
    commissioner: {
      eyebrow: 'Para sa mga Commissioner',
      title: 'Ang Control Room\nna Nararapat sa Iyong Liga.',
      subtitle:
        'Pamahalaan ang anumang format ng liga mula sa simula. Dispersal drafts, integrity monitoring, broadcast tools — lahat sa isang lugar. Ang iyong mga manager ay nakatuon sa pagkapanalo; ikaw ang nagpapatakbo.',
      badge: 'AF Commissioner',
      badgeBody: 'Isang subscription ang sumasaklaw sa bawat liga na pinapatakbo mo. Kanselahin anumang oras.',
      features: [
        {
          icon: '🏈',
          title: 'Dispersal Draft',
          body: 'Aalis ang mga manager? Pagsamahin ang kanilang mga asset at magsagawa ng live draft — awtomatiko.',
        },
        {
          icon: '🔍',
          title: 'Integrity Monitoring',
          body: 'Sinusuri ng AI ang bawat trade para sa koluson. Opt-in anti-tanking para mapanatiling tunay ang kompetisyon.',
        },
        {
          icon: '🎱',
          title: 'Weighted Lottery',
          body: 'NBA-style na draft order para sa dynasty leagues. Tinanggal ang tanking nang hindi kinukuha ang excitement.',
        },
        {
          icon: '📡',
          title: 'League Broadcast',
          body: 'Magpadala ng mga anunsyo, botohan, at kaganapan sa lahat ng iyong liga nang sabay-sabay.',
        },
      ],
      cta: 'Magsimula bilang Commissioner',
      ctaHref: '/signup?role=commissioner',
      secondaryCta: 'Tingnan ang mga Commissioner Plan',
      secondaryCtaHref: '/commissioner-upgrade?highlight=dispersal_draft',
    },
    tools: {
      eyebrow: 'AI Tools — Opsyonal, Ngunit Makapangyarihan',
      titleTop: 'Maglaro sa Sarili Mong Paraan.',
      titleBottom: 'AI Kung Kailan Mo Gusto.',
      subtitle:
        'Ang bawat manager ay nakakakuha ng mga AI tool na itinayo sa paligid ng scoring, roster, at matchup context ng iyong liga. Gamitin ang mga ito para makakuha ng kalamangan — o huwag. Anuman ang paraan, ito ay isang mahusay na season.',
      cards: [
        {
          icon: '⚖️',
          title: 'Trade Analyzer',
          body: 'AI fairness scores, value deltas, at lineup impact — bago ka tumanggap o tumanggi ng anumang deal.',
          previewTitle: 'Halimbawang output',
          previewLines: ['Fairness score: 92/100', 'Lineup swing: +11.8 pts', 'Hatol: tanggapin'],
        },
        {
          icon: '🎯',
          title: 'Draft Assistant',
          body: 'Live na tulong sa draft na may tier awareness, ADP tracking, at mga mungkahi batay sa pangangailangan.',
          previewTitle: 'Live draft cue',
          previewLines: ['Tier break sa 2 picks', 'Pinakamahusay na halaga: DeVonta Smith', 'Lumipat kung nagpapatuloy ang RB run'],
        },
        {
          icon: '🧠',
          title: 'Chimmy AI Coach',
          body: 'Magtanong ng kahit ano. Kilala ni Chimmy ang iyong roster, mga kalaban, at kung ano ang mahalaga ngayong linggo.',
          previewTitle: 'Halimbawang sagot',
          previewLines: ['I-start si Nico Collins kaysa Pittman.', 'Kailangan mo ng ceiling ngayong linggo.', 'Mahina ang kalaban laban sa mga labas na WR.'],
        },
      ],
      previewLabel: 'Halimbawang output',
      optionalNote: 'Ang AI ay opsyonal — maaari kang mag-draft, mag-trade, at manalo nang hindi gumagamit ng kahit isang AI tool.',
    },
    stats: [
      { value: '13+', label: 'Mga format ng liga' },
      { value: '7', label: 'Mga palakasang nsaklaw' },
      { value: '1M+', label: 'Mga AI analysis na naisagawa' },
    ],
    cta: {
      title: 'Ang Iyong Liga. Ang Iyong Mga Panuntunan.',
      body:
        'Nakakakuha ang mga commissioner ng dedicated na control room. Nakakakuha ang mga manlalaro ng AI na nakakaalam ng kanilang roster. Lahat ay nananalunan.',
      primary: 'Gumawa ng Libreng Account',
      commissionerPrimary: 'Magsimula ng Liga',
      secondary: 'Mag-sign In',
      primaryAuthed: 'Buksan ang App',
      secondaryAuthed: 'Dashboard',
      commissionerNote: 'Walang pagsusugal. Fantasy sports at brackets lamang. Libre para sa mga manlalaro.',
    },
    footer: {
      privacy: 'Pagkapribado',
      terms: 'Mga Tuntunin',
      dataDeletion: 'Pagtanggal ng Data',
      openApp: 'Buksan ang App',
      signIn: 'Mag-sign In',
      admin: 'Admin',
      geoNote: 'Hindi available sa WA. Mga bayad na liga ay limitado sa HI, ID, MT, NV. Ang AllFantasy ay 100% fantasy sports — walang pagsusugal.',
    },
  },
  vi: {
    nav: {
      brand: 'AllFantasy',
      signIn: 'Đăng nhập',
      signUp: 'Bắt đầu →',
      dashboard: 'Bảng điều khiển',
      admin: 'Quản trị',
      forCommissioners: '★ Dành cho Commissioner',
      ariaHome: 'Trang chủ AllFantasy',
      ariaSports: 'Các môn thể thao được hỗ trợ',
      ariaFooterNav: 'Điều hướng chân trang',
    },
    badge: '✦ Chỉ Fantasy Sports · Không Cờ Bạc · Miễn Phí Cho Người Chơi',
    hero: {
      titleTop: 'Quản lý giải đấu của bạn.',
      titleBottom: 'Chiến thắng giải đấu của bạn.',
      subtitle:
        'Ưu tiên Commissioner. Được hỗ trợ bởi AI. 100% fantasy sports — không có sportsbook, không cờ bạc. Nhập bất kỳ định dạng giải đấu nào và bắt đầu cạnh tranh trong vài phút.',
      primary: 'Bắt đầu Miễn Phí →',
      commissionerPrimary: 'Tạo Giải Đấu',
      secondary: 'Đăng nhập',
      alreadyHaveAccount: 'Đã có tài khoản? Đăng nhập',
      primaryAuthed: 'Đến Bảng Điều Khiển →',
      reassurance: 'Miễn phí cho người chơi · Commissioner từ $4.99/tháng · Hủy bất cứ lúc nào',
    },
    sports: ['NFL', 'NBA', 'NHL', 'MLB', 'NCAA', 'Bóng đá'],
    trust: [
      { icon: '🚫', text: 'Không cờ bạc · chỉ fantasy sports' },
      { icon: '⚡', text: '13+ định dạng giải đấu' },
      { icon: '📡', text: 'Nhập từ Sleeper, Yahoo và ESPN' },
      { icon: '🤖', text: 'AI tùy chọn — vui dù cách nào' },
    ],
    commissioner: {
      eyebrow: 'Dành cho Commissioner',
      title: 'Phòng Điều Khiển\nGiải Đấu Của Bạn Xứng Đáng.',
      subtitle:
        'Quản lý bất kỳ định dạng giải đấu nào ngay từ ngày đầu. Dispersal drafts, giám sát liêm chính, công cụ phát sóng — tất cả trong một nơi. Các manager của bạn tập trung vào chiến thắng; bạn điều hành chương trình.',
      badge: 'AF Commissioner',
      badgeBody: 'Một gói đăng ký bao gồm mọi giải đấu bạn điều hành. Hủy bất cứ lúc nào.',
      features: [
        {
          icon: '🏈',
          title: 'Dispersal Draft',
          body: 'Manager rời đi? Gộp tài sản của họ và tiến hành bản thảo trực tiếp — tự động.',
        },
        {
          icon: '🔍',
          title: 'Giám Sát Liêm Chính',
          body: 'AI theo dõi mọi giao dịch để phát hiện thông đồng. Tùy chọn chống tanking giữ cho cuộc cạnh tranh thực sự.',
        },
        {
          icon: '🎱',
          title: 'Xổ Số Có Trọng Số',
          body: 'Thứ tự bản thảo kiểu NBA cho giải đấu dynasty. Loại bỏ tanking mà không mất đi sự hào hứng.',
        },
        {
          icon: '📡',
          title: 'Phát Sóng Giải Đấu',
          body: 'Gửi thông báo, bình chọn và sự kiện đến tất cả các giải đấu của bạn cùng một lúc.',
        },
      ],
      cta: 'Bắt Đầu Với Tư Cách Commissioner',
      ctaHref: '/signup?role=commissioner',
      secondaryCta: 'Xem Gói Commissioner',
      secondaryCtaHref: '/commissioner-upgrade?highlight=dispersal_draft',
    },
    tools: {
      eyebrow: 'Công Cụ AI — Tùy Chọn, Nhưng Mạnh Mẽ',
      titleTop: 'Chơi Theo Cách Của Bạn.',
      titleBottom: 'AI Khi Bạn Muốn.',
      subtitle:
        'Mỗi manager nhận được công cụ AI được xây dựng xung quanh cài đặt tính điểm, danh sách và bối cảnh đối đầu của giải đấu. Sử dụng chúng để có lợi thế — hoặc không. Dù thế nào, đây cũng là một mùa giải tuyệt vời.',
      cards: [
        {
          icon: '⚖️',
          title: 'Trade Analyzer',
          body: 'Điểm công bằng AI, chênh lệch giá trị và tác động lineup — trước khi bạn chấp nhận hoặc từ chối bất kỳ giao dịch nào.',
          previewTitle: 'Ví dụ đầu ra',
          previewLines: ['Điểm công bằng: 92/100', 'Thay đổi lineup: +11.8 pts', 'Phán quyết: chấp nhận'],
        },
        {
          icon: '🎯',
          title: 'Draft Assistant',
          body: 'Hỗ trợ bản thảo trực tiếp với nhận thức về tier, theo dõi ADP và gợi ý chuyển hướng dựa trên nhu cầu.',
          previewTitle: 'Tín hiệu bản thảo trực tiếp',
          previewLines: ['Phá vỡ tier sau 2 lượt chọn', 'Giá trị tốt nhất: DeVonta Smith', 'Chuyển hướng nếu RB run tiếp tục'],
        },
        {
          icon: '🧠',
          title: 'Chimmy AI Coach',
          body: 'Hỏi bất cứ điều gì. Chimmy biết danh sách của bạn, đối thủ và điều gì quan trọng trong tuần này.',
          previewTitle: 'Ví dụ phản hồi',
          previewLines: ['Bắt đầu Nico Collins thay vì Pittman.', 'Bạn cần ceiling tuần này.', 'Đối thủ yếu trước các WR bên ngoài.'],
        },
      ],
      previewLabel: 'Ví dụ đầu ra',
      optionalNote: 'AI là tùy chọn — bạn có thể draft, trade và chiến thắng mà không cần chạm vào bất kỳ công cụ AI nào.',
    },
    stats: [
      { value: '13+', label: 'Định dạng giải đấu' },
      { value: '7', label: 'Môn thể thao được bao gồm' },
      { value: '1M+', label: 'Phân tích AI đã thực hiện' },
    ],
    cta: {
      title: 'Giải Đấu Của Bạn. Quy Tắc Của Bạn.',
      body:
        'Commissioner nhận được phòng điều khiển chuyên dụng. Người chơi nhận được AI biết danh sách của họ. Tất cả đều thắng.',
      primary: 'Tạo Tài Khoản Miễn Phí',
      commissionerPrimary: 'Tạo Giải Đấu',
      secondary: 'Đăng nhập',
      primaryAuthed: 'Mở Ứng Dụng',
      secondaryAuthed: 'Bảng Điều Khiển',
      commissionerNote: 'Không cờ bạc. Chỉ fantasy sports và brackets. Miễn phí cho người chơi.',
    },
    footer: {
      privacy: 'Quyền riêng tư',
      terms: 'Điều khoản',
      dataDeletion: 'Xóa dữ liệu',
      openApp: 'Mở Ứng Dụng',
      signIn: 'Đăng nhập',
      admin: 'Quản trị',
      geoNote: 'Không có sẵn ở WA. Các giải đấu trả phí bị hạn chế ở HI, ID, MT, NV. AllFantasy là 100% fantasy sports — không cờ bạc.',
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

type LandingPageClientProps = {
  initialSession?: Session | null
}

export default function LandingPageClient({
  initialSession = null,
}: LandingPageClientProps) {
  const { language } = useLanguage()
  const { status } = useOptionalSession()
  const copy = LANDING_COPY[language as keyof typeof LANDING_COPY] ?? LANDING_COPY.en
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
  const commissionerSignupHref = `/signup?role=commissioner&next=${encodeURIComponent('/dashboard')}`

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
          <Link href="/" className="flex items-center gap-2 px-1 py-1 transition-opacity hover:opacity-80" aria-label={copy.nav.ariaHome}>
            <Image
              src="/brand/allfantasy-wordmark-transparent.png"
              alt="AllFantasy wordmark"
              width={1198}
              height={306}
              priority
              className="nav-logo-img h-[34px] w-auto object-contain sm:h-[44px]"
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex">
              <LanguageToggle />
            </div>
            <Link
              href="#landing-commissioner"
              className="hidden text-sm font-medium transition hover:opacity-100 sm:inline-flex"
              style={{ color: '#f59e0b', opacity: 0.85 }}
            >
              {copy.nav.forCommissioners}
            </Link>
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
                  style={{ backgroundImage: 'linear-gradient(90deg, var(--accent-cyan), color-mix(in srgb, var(--accent-cyan-strong) 72%, #3b82f6))', color: 'var(--on-accent-bg)' }}
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
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pb-16 pt-24 text-center sm:px-6 sm:pb-20 sm:pt-28">
        {/* background glow */}
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

        {/* shield logo */}
        <div className="relative z-10 mb-6 sm:mb-8">
          <div className="landing-crest-glow absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-[440px] sm:w-[440px]" aria-hidden="true" />
          <div
            className="landing-float hero-logo-wrap relative flex flex-col items-center justify-center"
            style={{ filter: 'drop-shadow(0 24px 72px rgba(4,9,21,0.38))' }}
          >
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-[300px] sm:w-[300px]"
              aria-hidden="true"
              style={{
                background:
                  'radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--accent-cyan) 22%, transparent) 0%, transparent 62%), radial-gradient(circle at 50% 68%, color-mix(in srgb, var(--accent-purple) 12%, transparent) 0%, transparent 74%)',
              }}
            />
            <Image
              src="/brand/af-shield-transparent.png"
              alt="AllFantasy AF shield logo"
              className="hero-shield relative h-[130px] w-auto object-contain sm:h-[170px] lg:h-[210px]"
              priority
              width={584}
              height={625}
            />
          </div>
        </div>

        {/* badge */}
        <div
          className="relative z-10 mb-5 inline-flex max-w-[min(94vw,36rem)] items-center justify-center gap-2 rounded-2xl border px-3 py-1.5 text-center text-[10px] font-semibold tracking-[0.06em] sm:px-4 sm:py-2 sm:text-xs"
          style={{
            background: 'color-mix(in srgb, var(--accent-amber) 10%, transparent)',
            borderColor: 'color-mix(in srgb, var(--accent-amber) 28%, transparent)',
            color: 'var(--accent-amber-strong)',
          }}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--accent-amber-strong)', animation: 'landingPulse 2s ease-in-out infinite' }} />
          {copy.badge}
        </div>

        {/* headline */}
        <h1
          className="relative z-10 mb-4 max-w-4xl text-[38px] font-black leading-[0.93] tracking-[0.02em] sm:text-[62px] md:text-[80px]"
          style={{ color: 'var(--text)' }}
          data-testid="landing-hero-headline"
        >
          <span className="block">{copy.hero.titleTop}</span>
          <span className="block"><GradientWord>{copy.hero.titleBottom}</GradientWord></span>
        </h1>

        {/* subtitle */}
        <p className="relative z-10 mb-8 max-w-xl text-sm leading-6 sm:text-base sm:leading-7" style={{ color: 'var(--muted)' }}>
          {copy.hero.subtitle}
        </p>

        {/* CTAs */}
        <div className="relative z-10 mb-8 w-full max-w-xs sm:max-w-none">
          {isAuthenticated ? (
            <Link
              href={dashboardHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold transition hover:-translate-y-0.5 hover:opacity-90 sm:w-auto"
              style={{ backgroundImage: 'linear-gradient(90deg, var(--accent-cyan), color-mix(in srgb, var(--accent-cyan-strong) 72%, #3b82f6))', color: 'var(--on-accent-bg)' }}
              data-testid="landing-hero-dashboard"
              onClick={() => trackLandingCtaClick({ cta_label: copy.hero.primaryAuthed, cta_destination: dashboardHref, cta_type: 'primary', source: 'hero' })}
            >
              {copy.hero.primaryAuthed}
            </Link>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Link
                href={signupHref}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold transition hover:-translate-y-0.5 hover:opacity-90 sm:w-auto"
                style={{ backgroundImage: 'linear-gradient(90deg, var(--accent-cyan), color-mix(in srgb, var(--accent-cyan-strong) 72%, #3b82f6))', color: 'var(--on-accent-bg)' }}
                data-testid="landing-hero-sign-up"
                onClick={() => trackLandingCtaClick({ cta_label: copy.hero.primary, cta_destination: signupHref, cta_type: 'primary', source: 'hero' })}
              >
                {copy.hero.primary}
              </Link>
              <Link
                href={loginHref}
                className="mt-3 text-center text-sm font-medium underline underline-offset-4 transition hover:opacity-90"
                style={{ color: 'var(--accent-cyan)' }}
                data-testid="landing-hero-sign-in"
                onClick={() => trackLandingCtaClick({ cta_label: copy.hero.alreadyHaveAccount, cta_destination: loginHref, cta_type: 'secondary', source: 'hero' })}
              >
                {copy.hero.alreadyHaveAccount}
              </Link>
              <p className="mt-2 text-center text-[11px]" style={{ color: 'var(--muted)' }}>
                {copy.hero.reassurance}
              </p>
            </div>
          )}
        </div>

        {/* sports chips */}
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 px-2" aria-label={copy.nav.ariaSports}>
          {copy.sports.map((sport) => (
            <span
              key={sport}
              className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ background: 'color-mix(in srgb, var(--panel2) 78%, transparent)', borderColor: 'color-mix(in srgb, var(--border) 100%, transparent)', color: 'var(--muted)' }}
            >
              {sport}
            </span>
          ))}
        </div>
      </section>

      {/* ─── STATS + TRUST ─── */}
      <section className="border-t" style={{ borderColor: 'var(--border)' }}>
        {/* stats row */}
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="grid grid-cols-3 divide-x" style={{ divideColor: 'var(--border)' }}>
            {copy.stats.map((stat) => (
              <div key={stat.label} className="px-4 py-8 text-center sm:px-8">
                <div className="mb-1 text-3xl font-black leading-none sm:text-4xl">
                  <GradientWord>{stat.value}</GradientWord>
                </div>
                <div className="text-xs font-medium tracking-[0.03em] sm:text-sm" style={{ color: 'var(--muted)' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* trust pills */}
        <div className="border-t" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4 py-5 sm:px-6">
            {copy.trust.map((t) => (
              <span key={t.text} className="flex items-center gap-2 text-[12px] font-medium sm:text-sm" style={{ color: 'var(--muted)' }}>
                <span>{t.icon}</span>
                {t.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMMISSIONER ─── */}
      <section
        id="landing-commissioner"
        className="relative mx-4 my-6 overflow-hidden rounded-2xl border px-4 py-12 sm:mx-6 sm:px-8 sm:py-16"
        aria-labelledby="landing-commissioner-heading"
        style={{
          background: 'var(--panel)',
          borderColor: 'color-mix(in srgb, #f59e0b 20%, var(--border))',
          borderLeft: '3px solid #f59e0b',
        }}
      >
        <div className="mb-10 text-center">
          <span
            className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]"
            style={{ background: 'color-mix(in srgb, #f59e0b 12%, transparent)', borderColor: 'color-mix(in srgb, #f59e0b 30%, transparent)', color: '#f59e0b' }}
          >
            <span>★</span> {copy.commissioner.eyebrow}
          </span>
          <h2
            id="landing-commissioner-heading"
            className="mb-3 whitespace-pre-line text-[32px] font-black leading-[1.0] tracking-[0.02em] sm:text-[46px] md:text-[58px]"
            style={{ color: 'var(--text)' }}
          >
            {copy.commissioner.title}
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-7 sm:text-base sm:leading-8" style={{ color: 'var(--muted)' }}>
            {copy.commissioner.subtitle}
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl border sm:grid-cols-2" style={{ borderColor: 'var(--border)', background: 'var(--border)' }}>
          {copy.commissioner.features.map((feat) => (
            <div key={feat.title} className="px-6 py-6" style={{ background: 'var(--bg)' }}>
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border text-lg" style={{ background: 'color-mix(in srgb, #f59e0b 10%, transparent)', borderColor: 'color-mix(in srgb, #f59e0b 20%, transparent)' }}>
                {feat.icon}
              </div>
              <h3 className="mb-1.5 text-sm font-semibold">{feat.title}</h3>
              <p className="text-sm leading-6" style={{ color: 'var(--muted)' }}>{feat.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link
              href={commissionerSignupHref}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:opacity-90"
              style={{ backgroundImage: 'linear-gradient(90deg, #f59e0b, #d97706)' }}
              onClick={() => trackLandingCtaClick({ cta_label: copy.commissioner.cta, cta_destination: commissionerSignupHref, cta_type: 'primary', source: 'commissioner-section' })}
            >
              {copy.commissioner.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span
              className="rounded-xl border px-4 py-2.5 text-xs font-medium"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)', background: 'transparent' }}
            >
              {copy.commissioner.badgeBody}
            </span>
          </div>
          <Link
            href={copy.commissioner.secondaryCtaHref}
            className="text-sm font-semibold transition hover:opacity-90"
            style={{ color: '#f59e0b' }}
            onClick={() => trackLandingCtaClick({ cta_label: copy.commissioner.secondaryCta, cta_destination: copy.commissioner.secondaryCtaHref, cta_type: 'secondary', source: 'commissioner-section' })}
          >
            {copy.commissioner.secondaryCta}
          </Link>
        </div>
      </section>

      {/* ─── AI TOOLS ─── */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="landing-tools">
        <div className="mb-10 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-emerald-strong)' }}>
            {copy.tools.eyebrow}
          </p>
          <h2
            id="landing-tools"
            className="mb-3 text-[32px] font-black leading-[0.98] tracking-[0.025em] sm:text-[46px] md:text-[58px]"
            style={{ color: 'var(--text)' }}
          >
            <span className="block">{copy.tools.titleTop}</span>
            <span className="block"><GradientWord>{copy.tools.titleBottom}</GradientWord></span>
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-7 sm:text-base sm:leading-8" style={{ color: 'var(--muted)' }}>
            {copy.tools.subtitle}
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl border md:grid-cols-3" style={{ borderColor: 'var(--border)', background: 'var(--border)' }}>
          {copy.tools.cards.map((card) => (
            <article key={card.title} className="relative px-6 py-7" style={{ background: 'var(--panel)' }}>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border text-xl" style={{ background: 'color-mix(in srgb, var(--accent-cyan) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--accent-cyan) 18%, transparent)' }}>
                {card.icon}
              </div>
              <h3 className="mb-2 text-sm font-semibold sm:text-base">{card.title}</h3>
              <p className="mb-4 text-sm leading-6" style={{ color: 'var(--muted)' }}>{card.body}</p>
              <div
                className="rounded-xl border p-3"
                style={{ background: 'color-mix(in srgb, var(--panel2) 86%, transparent)', borderColor: 'color-mix(in srgb, var(--accent-cyan) 16%, var(--border))' }}
              >
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--accent-emerald-strong)' }}>
                  {card.previewTitle ?? copy.tools.previewLabel}
                </div>
                <div className="space-y-1.5">
                  {card.previewLines.map((line) => (
                    <div
                      key={line}
                      className="rounded-lg border px-2.5 py-1.5 text-xs font-medium"
                      style={{ borderColor: 'color-mix(in srgb, var(--border) 92%, transparent)', background: 'color-mix(in srgb, white 3%, transparent)', color: 'var(--text)' }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* AI optional note */}
        <p className="mt-5 text-center text-[12px]" style={{ color: 'var(--muted2)' }}>
          💡 {copy.tools.optionalNote}
        </p>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="relative overflow-hidden px-4 pb-20 pt-6 text-center sm:px-6 sm:pb-24" aria-labelledby="landing-cta">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 65% 80% at 50% 50%, color-mix(in srgb, var(--accent-cyan) 12%, transparent) 0%, transparent 70%)' }}
          aria-hidden="true"
        />
        <Image
          src="/brand/af-shield-transparent.png"
          alt=""
          width={584}
          height={625}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[200px] w-auto -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.05] sm:h-[260px]"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-2xl">
          <h2
            id="landing-cta"
            className="mb-3 text-[34px] font-black leading-[1.0] tracking-[0.025em] sm:text-[48px] md:text-[60px]"
            style={{ color: 'var(--text)' }}
          >
            {copy.cta.title}
          </h2>
          <p className="mx-auto mb-8 max-w-lg text-sm leading-7 sm:text-base sm:leading-8" style={{ color: 'var(--muted)' }}>
            {copy.cta.body}
          </p>
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href={isAuthenticated ? dashboardHref : signupHref}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:opacity-90"
                style={{ backgroundImage: 'linear-gradient(90deg, var(--accent-cyan), color-mix(in srgb, var(--accent-cyan-strong) 72%, #3b82f6))', color: 'var(--on-accent-bg)' }}
                data-testid="landing-cta-primary"
                onClick={() => trackLandingCtaClick({ cta_label: isAuthenticated ? copy.cta.primaryAuthed : copy.cta.primary, cta_destination: isAuthenticated ? dashboardHref : signupHref, cta_type: 'primary', source: 'cta-band' })}
              >
                {isAuthenticated ? copy.cta.primaryAuthed : copy.cta.primary}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {!isAuthenticated && (
                <Link
                  href={commissionerSignupHref}
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:opacity-90"
                  style={{ backgroundImage: 'linear-gradient(90deg, #f59e0b, #d97706)' }}
                  data-testid="landing-cta-commissioner"
                  onClick={() => trackLandingCtaClick({ cta_label: copy.cta.commissionerPrimary, cta_destination: commissionerSignupHref, cta_type: 'primary', source: 'cta-band-commissioner' })}
                >
                  {copy.cta.commissionerPrimary}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link
                href={isAuthenticated ? dashboardHref : loginHref}
                className="inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-medium transition hover:-translate-y-0.5"
                style={{ background: 'color-mix(in srgb, var(--panel) 88%, transparent)', borderColor: 'var(--border)', color: 'var(--text)' }}
                data-testid="landing-cta-secondary"
                onClick={() => trackLandingCtaClick({ cta_label: isAuthenticated ? copy.cta.secondaryAuthed : copy.cta.secondary, cta_destination: isAuthenticated ? dashboardHref : loginHref, cta_type: 'secondary', source: 'cta-band' })}
              >
                {isAuthenticated ? copy.cta.secondaryAuthed : copy.cta.secondary}
              </Link>
            </div>
            {!isAuthenticated && (
              <p className="mt-1 text-center text-[11px]" style={{ color: 'var(--muted)' }}>
                {copy.cta.commissionerNote}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t px-4 py-6 sm:px-6" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-6xl">
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
              <Link href={loginUrlWithIntent('/dashboard')} className="text-sm transition-colors [color:var(--muted)] hover:[color:var(--text)]">{copy.footer.signIn}</Link>
              <Link href="/admin" className="text-sm transition-colors [color:var(--muted)] hover:[color:var(--text)]">{copy.footer.admin}</Link>
            </nav>
          </div>
          {/* Language toggle — visible on all screen sizes (nav toggle is desktop-only) */}
          <div className="mt-4 flex md:hidden">
            <LanguageToggle />
          </div>
          {/* geo note */}
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

        .hero-logo-wrap {
          background: transparent !important;
          isolation: auto;
        }

        @keyframes landingFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes landingPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
      `}</style>
    </main>
  )
}
