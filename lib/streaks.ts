import { prisma } from "@/lib/prisma";
import { getDateKey } from "@/lib/usage";

export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  lastActiveDate: string | null;
  badges: Badge[];
  todayCompleted: boolean;
};

export type Badge = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  earnedAt: string | null;
  locked: boolean;
};

const BADGE_THRESHOLDS: Omit<Badge, "earnedAt" | "locked">[] = [
  { id: "beginner", label: "Beginner", emoji: "🌱", description: "3 day streak" },
  { id: "zen_builder", label: "Zen Builder", emoji: "🧘", description: "7 day streak" },
  { id: "aura_master", label: "Aura Master", emoji: "✨", description: "30 day streak" },
  { id: "cosmic_mind", label: "Cosmic Mind", emoji: "🌌", description: "100 day streak" },
];

const BADGE_DAYS: Record<string, number> = {
  beginner: 3,
  zen_builder: 7,
  aura_master: 30,
  cosmic_mind: 100,
};

type StreakRow = {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  total_days: number;
  last_active_date: string | null;
  updated_at: Date;
};

let streakTablesReady: Promise<void> | null = null;

async function ensureStreakTables() {
  if (!streakTablesReady) {
    streakTablesReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "wellness_user_streaks" (
          "user_id" TEXT PRIMARY KEY,
          "current_streak" INTEGER NOT NULL DEFAULT 0,
          "longest_streak" INTEGER NOT NULL DEFAULT 0,
          "total_days" INTEGER NOT NULL DEFAULT 0,
          "last_active_date" TEXT,
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
    })();
  }

  await streakTablesReady;
}

function buildBadges(longestStreak: number, updatedAt: Date | null): Badge[] {
  return BADGE_THRESHOLDS.map((badge) => {
    const required = BADGE_DAYS[badge.id] ?? 999;
    const earned = longestStreak >= required;
    return {
      ...badge,
      locked: !earned,
      earnedAt: earned && updatedAt ? updatedAt.toISOString() : null,
    };
  });
}

export async function getUserStreakSummary(userId: string): Promise<StreakData> {
  await ensureStreakTables();

  const rows = await prisma.$queryRawUnsafe<StreakRow[]>(
    `
      SELECT "user_id", "current_streak", "longest_streak", "total_days", "last_active_date", "updated_at"
      FROM "wellness_user_streaks"
      WHERE "user_id" = $1
      LIMIT 1
    `,
    userId
  );

  const streak = rows[0];
  const currentStreak = streak?.current_streak ?? 0;
  const longestStreak = streak?.longest_streak ?? 0;
  const totalDays = streak?.total_days ?? 0;
  const lastActiveDate = streak?.last_active_date ?? null;
  const todayCompleted = lastActiveDate === getDateKey();

  return {
    currentStreak,
    longestStreak,
    totalDays,
    lastActiveDate,
    badges: buildBadges(longestStreak, streak?.updated_at ?? null),
    todayCompleted,
  };
}

export async function incrementStreak(userId: string): Promise<StreakData> {
  await ensureStreakTables();

  const today = getDateKey();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getDateKey(yesterday);

  const existingRows = await prisma.$queryRawUnsafe<StreakRow[]>(
    `
      SELECT "user_id", "current_streak", "longest_streak", "total_days", "last_active_date", "updated_at"
      FROM "wellness_user_streaks"
      WHERE "user_id" = $1
      LIMIT 1
    `,
    userId
  );

  const existing = existingRows[0];

  if (existing?.last_active_date === today) {
    return getUserStreakSummary(userId);
  }

  const continued = existing?.last_active_date === yesterdayKey;
  const newCurrent = continued ? (existing?.current_streak ?? 0) + 1 : 1;
  const newLongest = Math.max(newCurrent, existing?.longest_streak ?? 0);
  const newTotal = (existing?.total_days ?? 0) + 1;

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "wellness_user_streaks" (
        "user_id",
        "current_streak",
        "longest_streak",
        "total_days",
        "last_active_date",
        "updated_at"
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT ("user_id")
      DO UPDATE SET
        "current_streak" = EXCLUDED."current_streak",
        "longest_streak" = EXCLUDED."longest_streak",
        "total_days" = EXCLUDED."total_days",
        "last_active_date" = EXCLUDED."last_active_date",
        "updated_at" = NOW()
    `,
    userId,
    newCurrent,
    newLongest,
    newTotal,
    today
  );

  return getUserStreakSummary(userId);
}
