-- Align DB default with product season year; new rows without explicit `season` no longer inherit 2024.
ALTER TABLE "League" ALTER COLUMN "season" SET DEFAULT 2026;

-- Native AF leagues that only had Prisma's old default (2024) should display the current calendar year in the rail.
UPDATE "League"
SET "season" = EXTRACT(YEAR FROM NOW())::int
WHERE "platform" = 'manual' AND "season" = 2024;
