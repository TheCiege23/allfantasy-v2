---
title: Create and Secure Supabase Storage Buckets
impact: MEDIUM
impactDescription: File storage with RLS-based access control via SQL
tags: supabase, storage, buckets, rls, file-upload
---

## Create and Secure Supabase Storage Buckets

Supabase Storage uses the `storage` schema for bucket and object management. Buckets can be created and secured via SQL with RLS policies on `storage.objects`.

**Create a bucket via SQL:**

```sql
-- Insert into storage.buckets to create a new bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;

-- Public bucket (anyone can read, auth required to write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('league-logos', 'league-logos', true)
ON CONFLICT (id) DO NOTHING;
```

**RLS policies on storage.objects:**

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "users_upload_avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::TEXT)
  );

-- Allow users to read their own avatars
CREATE POLICY "users_read_own_avatar" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::TEXT)
  );

-- Allow anyone to read from public bucket
CREATE POLICY "public_read_logos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'league-logos');

-- Allow users to delete their own files
CREATE POLICY "users_delete_own_files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::TEXT)
  );
```

**Bucket configuration options:**

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  false,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
```

**Client-side upload (TypeScript):**

```typescript
const { data, error } = await supabase.storage
  .from("avatars")
  .upload(`${userId}/avatar.png`, file, {
    cacheControl: "3600",
    upsert: true,
  });

// Get public URL (for public buckets)
const { data: { publicUrl } } = supabase.storage
  .from("league-logos")
  .getPublicUrl("logo.png");
```

Reference: [Supabase Storage](https://supabase.com/docs/guides/storage)
