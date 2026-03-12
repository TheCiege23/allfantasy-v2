import { prisma } from "@/lib/prisma";
import { getDateKey } from "@/lib/usage";

export type MoodOption = {
  value: string;
  emoji: string;
  label: string;
  color: string;
  recommendations: {
    duration: string;
    meditationType: string;
    sound: string;
    breathingStyle: string;
    message: string;
  };
};

export const MOOD_OPTIONS: MoodOption[] = [
  {
    value: "calm",
    emoji: "🙂",
    label: "Calm",
    color: "from-sky-400 to-blue-500",
    recommendations: {
      duration: "10 min",
      meditationType: "focus",
      sound: "forest",
      breathingStyle: "calm",
      message: "You're in a clear headspace. A steady focus session can sharpen that calm.",
    },
  },
  {
    value: "anxious",
    emoji: "😟",
    label: "Anxious",
    color: "from-amber-400 to-orange-500",
    recommendations: {
      duration: "5 min",
      meditationType: "anxiety_reset",
      sound: "rain",
      breathingStyle: "4-7-8",
      message: "A 4-7-8 breathing reset can settle the moment without asking too much of you.",
    },
  },
  {
    value: "tired",
    emoji: "😴",
    label: "Tired",
    color: "from-indigo-400 to-violet-500",
    recommendations: {
      duration: "5 min",
      meditationType: "energy",
      sound: "birds",
      breathingStyle: "deep-reset",
      message: "A soft energy reset can help you feel more present without overstimulation.",
    },
  },
  {
    value: "energetic",
    emoji: "⚡",
    label: "Energetic",
    color: "from-emerald-400 to-teal-500",
    recommendations: {
      duration: "10 min",
      meditationType: "focus",
      sound: "forest",
      breathingStyle: "box",
      message: "Channel that momentum with a grounded rhythm so the energy stays useful.",
    },
  },
  {
    value: "overwhelmed",
    emoji: "🤯",
    label: "Overwhelmed",
    color: "from-rose-400 to-pink-500",
    recommendations: {
      duration: "3 min",
      meditationType: "stress_relief",
      sound: "rain",
      breathingStyle: "calm",
      message: "Start small. A short reset is enough to soften the edge of a heavy moment.",
    },
  },
];

export type MoodEntry = {
  id: string;
  mood: string;
  note: string | null;
  dateKey: string;
  createdAt: string;
};

export type MoodTrend = {
  dateKey: string;
  mood: string;
  emoji: string;
};

type MoodRow = {
  id: string;
  mood: string;
  note: string | null;
  date_key: string;
  created_at: Date;
};

let moodTablesReady: Promise<void> | null = null;

async function ensureMoodTables() {
  if (!moodTablesReady) {
    moodTablesReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "wellness_mood_entries" (
          "id" TEXT PRIMARY KEY,
          "user_id" TEXT NOT NULL,
          "mood" TEXT NOT NULL,
          "note" TEXT,
          "date_key" TEXT NOT NULL,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE ("user_id", "date_key")
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "wellness_mood_entries_user_id_idx"
        ON "wellness_mood_entries" ("user_id")
      `);
    })();
  }

  await moodTablesReady;
}

function toMoodEntry(row: MoodRow): MoodEntry {
  return {
    id: row.id,
    mood: row.mood,
    note: row.note,
    dateKey: row.date_key,
    createdAt: row.created_at.toISOString(),
  };
}

export async function logMoodEntry(userId: string, mood: string, note?: string): Promise<MoodEntry> {
  await ensureMoodTables();

  const dateKey = getDateKey();
  const entryId = crypto.randomUUID();
  const rows = await prisma.$queryRawUnsafe<MoodRow[]>(
    `
      INSERT INTO "wellness_mood_entries" ("id", "user_id", "mood", "note", "date_key")
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT ("user_id", "date_key")
      DO UPDATE SET
        "mood" = EXCLUDED."mood",
        "note" = EXCLUDED."note",
        "updated_at" = NOW()
      RETURNING "id", "mood", "note", "date_key", "created_at"
    `,
    entryId,
    userId,
    mood,
    note ?? null,
    dateKey
  );

  return toMoodEntry(rows[0]);
}

export async function getTodayMood(userId: string): Promise<MoodEntry | null> {
  await ensureMoodTables();

  const dateKey = getDateKey();
  const rows = await prisma.$queryRawUnsafe<MoodRow[]>(
    `
      SELECT "id", "mood", "note", "date_key", "created_at"
      FROM "wellness_mood_entries"
      WHERE "user_id" = $1 AND "date_key" = $2
      LIMIT 1
    `,
    userId,
    dateKey
  );

  return rows[0] ? toMoodEntry(rows[0]) : null;
}

export async function getMoodHistory(userId: string, days = 30): Promise<MoodTrend[]> {
  await ensureMoodTables();

  const rows = await prisma.$queryRawUnsafe<MoodRow[]>(
    `
      SELECT "id", "mood", "note", "date_key", "created_at"
      FROM "wellness_mood_entries"
      WHERE "user_id" = $1
      ORDER BY "created_at" DESC
      LIMIT $2
    `,
    userId,
    days
  );

  return rows.map((entry) => ({
    dateKey: entry.date_key,
    mood: entry.mood,
    emoji: MOOD_OPTIONS.find((item) => item.value === entry.mood)?.emoji ?? "🙂",
  }));
}

export function getMoodRecommendation(mood: string) {
  return (
    MOOD_OPTIONS.find((option) => option.value === mood)?.recommendations ??
    MOOD_OPTIONS[0].recommendations
  );
}
