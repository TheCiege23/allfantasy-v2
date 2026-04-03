-- Discord OAuth + league sync (Tier 1 / Tier 2 prep)

ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "discordUserId" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "discordUsername" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "discordEmail" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "discordAvatar" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "discordAccessToken" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "discordRefreshToken" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "discordConnectedAt" TIMESTAMP(3);
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "discordGuildId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_discordUserId_key" ON "user_profiles"("discordUserId");

ALTER TABLE "league_chat_messages" ADD COLUMN IF NOT EXISTS "discordMessageId" VARCHAR(64);
ALTER TABLE "league_chat_messages" ADD COLUMN IF NOT EXISTS "sourceDiscord" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "discord_guild_links" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "guildName" TEXT,
    "linkedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discord_guild_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "discord_guild_links_guildId_key" ON "discord_guild_links"("guildId");
CREATE INDEX IF NOT EXISTS "discord_guild_links_linkedByUserId_idx" ON "discord_guild_links"("linkedByUserId");

DO $$
BEGIN
  ALTER TABLE "discord_guild_links" ADD CONSTRAINT "discord_guild_links_linkedByUserId_fkey"
    FOREIGN KEY ("linkedByUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "discord_league_channels" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelName" TEXT,
    "webhookId" TEXT,
    "webhookToken" TEXT,
    "lastSyncedMessageId" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "syncOutbound" BOOLEAN NOT NULL DEFAULT true,
    "syncInbound" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discord_league_channels_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "discord_league_channels_channelId_key" ON "discord_league_channels"("channelId");
CREATE UNIQUE INDEX IF NOT EXISTS "discord_league_channels_leagueId_guildId_key" ON "discord_league_channels"("leagueId", "guildId");
CREATE INDEX IF NOT EXISTS "discord_league_channels_leagueId_idx" ON "discord_league_channels"("leagueId");
CREATE INDEX IF NOT EXISTS "discord_league_channels_guildId_idx" ON "discord_league_channels"("guildId");

DO $$
BEGIN
  ALTER TABLE "discord_league_channels" ADD CONSTRAINT "discord_league_channels_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "discord_league_channels" ADD CONSTRAINT "discord_league_channels_guildId_fkey"
    FOREIGN KEY ("guildId") REFERENCES "discord_guild_links"("guildId") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "discord_message_links" (
    "id" TEXT NOT NULL,
    "leagueMessageId" TEXT,
    "discordMessageId" TEXT,
    "direction" VARCHAR(16) NOT NULL,
    "guildId" TEXT,
    "channelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discord_message_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "discord_message_links_leagueMessageId_idx" ON "discord_message_links"("leagueMessageId");
CREATE INDEX IF NOT EXISTS "discord_message_links_discordMessageId_idx" ON "discord_message_links"("discordMessageId");
