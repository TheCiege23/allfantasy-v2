-- Optional week after which unused Survivor idols expire (null = Final 5 default). Schema field existed without DB column.
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorIdolExpiryWeek" INTEGER;
