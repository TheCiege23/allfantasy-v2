-- AlterTable: optional invite expiry for bracket league invites (Viral League Invite system).
ALTER TABLE "BracketLeague" ADD COLUMN IF NOT EXISTS "inviteExpiresAt" TIMESTAMP(3);
