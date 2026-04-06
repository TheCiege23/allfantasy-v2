-- Chimmy ElevenLabs voice preference (cross-device sync via /api/user/profile).
ALTER TABLE "user_profiles" ADD COLUMN "chimmy_tts_voice_id" TEXT;
