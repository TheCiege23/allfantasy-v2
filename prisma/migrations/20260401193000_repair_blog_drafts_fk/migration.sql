DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'blog_drafts'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'blog_articles'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'blog_drafts_articleId_fkey'
    ) THEN
        ALTER TABLE "blog_drafts"
        ADD CONSTRAINT "blog_drafts_articleId_fkey"
        FOREIGN KEY ("articleId") REFERENCES "blog_articles"("articleId") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
