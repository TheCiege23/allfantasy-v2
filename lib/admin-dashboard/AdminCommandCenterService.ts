import { prisma } from "@/lib/prisma"

type MetricValue = number | string

export type AdminMetric = {
  label: string
  value: MetricValue
  tracked: boolean
  note?: string
}

export type AdminUserSearchRow = {
  id: string
  username: string
  displayName: string | null
  emailMasked: string
  createdAt: string
  subscriptionStatus: string
  tokenBalance: number | null
  worldCupEntries: number
  worldCupPoolsCreated: number
}

export type AdminActivePoolRow = {
  id: string
  name: string
  ownerUsername: string | null
  entries: number
  participants: number
  chatEvents: number
}

export type AdminCommandCenterMetrics = {
  generatedAt: string
  users: AdminMetric[]
  subscriptions: AdminMetric[]
  tokens: AdminMetric[]
  ai: AdminMetric[]
  worldCup: AdminMetric[]
  health: AdminMetric[]
  usersSearch: AdminUserSearchRow[]
  activeWorldCupPools: AdminActivePoolRow[]
}

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"]
const FAILED_OR_CANCELED_STATUSES = ["failed", "canceled", "cancelled", "incomplete", "unpaid"]

function metric(label: string, value: MetricValue, note?: string): AdminMetric {
  return { label, value, tracked: true, note }
}

function notTracked(label: string, note = "Not tracked yet"): AdminMetric {
  return { label, value: note, tracked: false, note }
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

function startOfUtcDay(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export function maskAdminEmail(email: string | null | undefined): string {
  const value = String(email ?? "").trim()
  if (!value.includes("@")) return "No email"
  const [name, domain] = value.split("@")
  const visible = name.length <= 2 ? `${name.slice(0, 1)}*` : `${name.slice(0, 2)}***`
  return `${visible}@${domain}`
}

function parseAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(/[\n\r,;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

function classifySubscriptionCycle(sku: string | null | undefined, planCode: string | null | undefined): "annual" | "monthly" | "unknown" {
  const value = `${sku ?? ""} ${planCode ?? ""}`.toLowerCase()
  if (/\b(annual|year|yearly|yr)\b/.test(value)) return "annual"
  if (/\b(month|monthly|mo)\b/.test(value)) return "monthly"
  return "unknown"
}

async function countAdminUsers(): Promise<number> {
  const adminEmails = parseAdminEmails()
  if (adminEmails.length === 0) return 0
  return prisma.appUser.count({
    where: {
      OR: adminEmails.map((email) => ({
        email: { equals: email, mode: "insensitive" as const },
      })),
    },
  })
}

async function getUserSearchRows(query: string): Promise<AdminUserSearchRow[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const rows = await prisma.appUser.findMany({
    where: {
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      createdAt: true,
      userSubscriptions: {
        select: { status: true, plan: { select: { code: true } } },
        orderBy: { updatedAt: "desc" },
        take: 3,
      },
      tokenBalance: { select: { balance: true } },
      _count: {
        select: {
          worldCupBracketEntries: true,
          worldCupBracketChallengesOwned: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return rows.map((user) => {
    const subscriptionStatus =
      user.userSubscriptions.find((sub) => ACTIVE_SUBSCRIPTION_STATUSES.includes(sub.status.toLowerCase()))?.status ??
      user.userSubscriptions[0]?.status ??
      "free"
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      emailMasked: maskAdminEmail(user.email),
      createdAt: user.createdAt.toISOString(),
      subscriptionStatus,
      tokenBalance: user.tokenBalance?.balance ?? null,
      worldCupEntries: user._count.worldCupBracketEntries,
      worldCupPoolsCreated: user._count.worldCupBracketChallengesOwned,
    }
  })
}

async function getMostActiveWorldCupPools(): Promise<AdminActivePoolRow[]> {
  const pools = await prisma.worldCupBracketChallenge.findMany({
    select: {
      id: true,
      name: true,
      owner: { select: { username: true } },
      _count: {
        select: {
          entries: true,
          participants: true,
          chatEvents: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  })

  return pools
    .map((pool) => ({
      id: pool.id,
      name: pool.name,
      ownerUsername: pool.owner.username,
      entries: pool._count.entries,
      participants: pool._count.participants,
      chatEvents: pool._count.chatEvents,
    }))
    .sort((a, b) => b.entries + b.participants + b.chatEvents - (a.entries + a.participants + a.chatEvents))
    .slice(0, 8)
}

export async function getAdminCommandCenterMetrics(searchQuery = ""): Promise<AdminCommandCenterMetrics> {
  const today = startOfUtcDay()
  const sevenDaysAgo = daysAgo(7)
  const thirtyDaysAgo = daysAgo(30)

  const [
    totalAccounts,
    accountsToday,
    accounts7Days,
    accounts30Days,
    activeSubscriptionUsers,
    adminUsers,
    subscriptions,
    failedOrCanceledSubscriptions,
    bracketPaymentsCompleted,
    bracketPaymentRevenue,
    stripeEvents,
    tokenGranted,
    tokenSpent,
    tokenBalances,
    chatConversations,
    chatMessages,
    chimmyMessages,
    worldCupPools,
    worldCupEntries,
    finalizedEntries,
    worldCupParticipants,
    commissionerPools,
    worldCupChatEvents,
    platformChatMessages,
    activeWorldCupPools,
    usersSearch,
    databaseHealth,
  ] = await Promise.all([
    prisma.appUser.count(),
    prisma.appUser.count({ where: { createdAt: { gte: today } } }),
    prisma.appUser.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.appUser.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.userSubscription.groupBy({
      by: ["userId"],
      where: { status: { in: ACTIVE_SUBSCRIPTION_STATUSES } },
    }),
    countAdminUsers(),
    prisma.userSubscription.findMany({
      select: {
        status: true,
        sku: true,
        plan: { select: { code: true } },
      },
    }),
    prisma.userSubscription.count({
      where: { status: { in: FAILED_OR_CANCELED_STATUSES } },
    }),
    prisma.bracketPayment.count({ where: { status: { in: ["completed", "paid", "succeeded"] } } }),
    prisma.bracketPayment.aggregate({
      where: { status: { in: ["completed", "paid", "succeeded"] } },
      _sum: { amountCents: true },
    }),
    prisma.stripeWebhookEvent.count(),
    prisma.tokenLedger.aggregate({
      where: { tokenDelta: { gt: 0 } },
      _sum: { tokenDelta: true },
    }),
    prisma.tokenLedger.aggregate({
      where: { tokenDelta: { lt: 0 } },
      _sum: { tokenDelta: true },
    }),
    prisma.userTokenBalance.findMany({
      select: {
        balance: true,
        lifetimePurchased: true,
        lifetimeSpent: true,
        user: { select: { username: true, email: true } },
      },
      orderBy: { lifetimeSpent: "desc" },
      take: 8,
    }),
    prisma.chatConversation.count(),
    prisma.chatHistory.count(),
    prisma.chatHistory.count({ where: { role: { in: ["assistant", "chimmy"] } } }),
    prisma.worldCupBracketChallenge.count(),
    prisma.worldCupBracketEntry.count(),
    prisma.worldCupBracketEntry.count({ where: { OR: [{ isComplete: true }, { submittedAt: { not: null } }] } }),
    prisma.worldCupBracketParticipant.count(),
    prisma.worldCupBracketChallenge.count({ where: { ownerUserId: { not: "" } } }),
    prisma.worldCupBracketChatEvent.count(),
    prisma.platformChatMessage.count(),
    getMostActiveWorldCupPools(),
    getUserSearchRows(searchQuery),
    prisma.$queryRaw`SELECT 1`.then(() => "healthy").catch(() => "down"),
  ])

  const cycleCounts = subscriptions.reduce(
    (acc, sub) => {
      const cycle = classifySubscriptionCycle(sub.sku, sub.plan.code)
      acc[cycle] += 1
      return acc
    },
    { annual: 0, monthly: 0, unknown: 0 }
  )
  const activeSubscriptionUserCount = activeSubscriptionUsers.length
  const completedRevenueCents = bracketPaymentRevenue._sum.amountCents ?? null

  return {
    generatedAt: new Date().toISOString(),
    users: [
      metric("Total accounts", totalAccounts),
      metric("Created today", accountsToday, "UTC day"),
      metric("Created 7 days", accounts7Days),
      metric("Created 30 days", accounts30Days),
      notTracked("Active users", "Login/activity heartbeat is not tracked yet"),
      metric("Free users", Math.max(0, totalAccounts - activeSubscriptionUserCount), "Derived from active subscriptions"),
      metric("Pro/subscribed users", activeSubscriptionUserCount),
      metric("Admin users", adminUsers, "Derived from ADMIN_EMAILS allowlist"),
    ],
    subscriptions: [
      metric("Total subscriptions", subscriptions.length),
      metric("Monthly subscriptions", cycleCounts.monthly, "Derived from plan code/SKU text"),
      metric("Annual subscriptions", cycleCounts.annual, "Derived from plan code/SKU text"),
      metric("Unknown billing cycle", cycleCounts.unknown),
      metric("Failed/canceled subscriptions", failedOrCanceledSubscriptions),
      metric("Stripe webhook events", stripeEvents),
      metric("Completed bracket payments", bracketPaymentsCompleted),
      completedRevenueCents === null
        ? notTracked("Bracket payment revenue", "No completed bracket payments recorded")
        : metric("Bracket payment revenue", `$${(completedRevenueCents / 100).toFixed(2)}`),
      notTracked("MRR estimate", "Subscription prices are not reliably stored on subscription rows"),
    ],
    tokens: [
      metric("Total tokens granted", tokenGranted._sum.tokenDelta ?? 0),
      metric("Total tokens spent", Math.abs(tokenSpent._sum.tokenDelta ?? 0)),
      metric("Users with token balances", tokenBalances.length, "Top spenders listed below"),
      ...tokenBalances.slice(0, 5).map((row) =>
        metric(
          `@${row.user.username}`,
          `${row.balance} left / ${row.lifetimeSpent} spent`,
          maskAdminEmail(row.user.email)
        )
      ),
    ],
    ai: [
      metric("AI conversations", chatConversations),
      metric("AI/chat messages", chatMessages),
      metric("Chimmy replies", chimmyMessages, "Derived from chat_history role"),
      notTracked("Failed AI requests", "No unified failed-AI request table found"),
    ],
    worldCup: [
      metric("World Cup pools", worldCupPools),
      metric("Bracket entries", worldCupEntries),
      metric("Finalized entries", finalizedEntries),
      metric("Pool participants", worldCupParticipants),
      metric("Commissioner-created pools", commissionerPools),
      metric("World Cup chat events", worldCupChatEvents),
      metric("Shared chat messages", platformChatMessages),
      notTracked("Invite activity", "Invite creation exists, click/open activity is not tracked yet"),
    ],
    health: [
      metric("Database", databaseHealth),
      metric("Generated", new Date().toLocaleString("en-US", { timeZone: "America/New_York" }), "America/New_York"),
    ],
    usersSearch,
    activeWorldCupPools,
  }
}
