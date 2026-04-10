-- ============================================================================
-- STORAGE SETUP INSTRUCTIONS
-- ============================================================================
-- 
-- IMPORTANT: Storage buckets and policies CANNOT be created via SQL Editor
-- in Supabase. You must use the Supabase Dashboard.
--
-- Follow these steps in the Supabase Dashboard:
--
-- ============================================================================
-- STEP 1: Create Buckets (Dashboard → Storage → New Bucket)
-- ============================================================================
--
-- BUCKET 1: report-photos
-- -------------------------
-- - Name: report-photos
-- - Public: OFF (unchecked)
-- - File size limit: 5MB
-- - Allowed MIME types: image/jpeg, image/png, image/webp, image/heic
--
-- BUCKET 2: avatars
-- -------------------------
-- - Name: avatars  
-- - Public: ON (checked)
-- - File size limit: 2MB
-- - Allowed MIME types: image/jpeg, image/png, image/webp
--
-- BUCKET 3: assets
-- -------------------------
-- - Name: assets
-- - Public: ON (checked)
-- - File size limit: 1MB
-- - Allowed MIME types: image/jpeg, image/png, image/webp, image/svg+xml
--
-- ============================================================================
-- STEP 2: Create Policies (Click bucket → Policies → New Policy)
-- ============================================================================
--
-- For each bucket, create policies using "Custom policies" option.
-- Copy the policy definitions below.
--
-- ============================================================================


-- ============================================================================
-- HELPER FUNCTION (Run this in SQL Editor - it's in public schema)
-- ============================================================================

-- Helper function to extract neighborhood_id from storage path
-- Path format: {neighborhood_id}/{user_id}/{filename}
CREATE OR REPLACE FUNCTION public.get_neighborhood_from_path(path TEXT)
RETURNS UUID AS $$
BEGIN
  RETURN (STRING_TO_ARRAY(path, '/'))[1]::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_neighborhood_from_path(TEXT) TO authenticated;


-- ============================================================================
-- POLICY DEFINITIONS FOR DASHBOARD
-- ============================================================================
-- 
-- Copy these policy definitions into the Supabase Dashboard.
-- Go to Storage → [bucket name] → Policies → New Policy → Custom
--
-- ============================================================================
-- REPORT-PHOTOS BUCKET POLICIES
-- ============================================================================
--
-- Policy 1: "Allow authenticated users to upload to their neighborhood"
-- Operation: INSERT
-- Target roles: authenticated
-- Policy definition:
/*
(bucket_id = 'report-photos') AND 
(public.get_neighborhood_from_path(name) = public.get_my_neighborhood_id()) AND
((string_to_array(name, '/'))[2] = (auth.uid())::text)
*/
--
-- Policy 2: "Allow authenticated users to view photos in their neighborhood"
-- Operation: SELECT
-- Target roles: authenticated
-- Policy definition:
/*
(bucket_id = 'report-photos') AND 
(public.get_neighborhood_from_path(name) = public.get_my_neighborhood_id())
*/
--
-- Policy 3: "Allow users to delete their own photos"
-- Operation: DELETE
-- Target roles: authenticated
-- Policy definition:
/*
(bucket_id = 'report-photos') AND 
((string_to_array(name, '/'))[2] = (auth.uid())::text)
*/
--
-- Policy 4: "Allow admins full access to neighborhood photos"
-- Operation: ALL
-- Target roles: authenticated
-- Policy definition (USING):
/*
(bucket_id = 'report-photos') AND 
public.is_admin() AND 
(public.get_neighborhood_from_path(name) = public.get_my_neighborhood_id())
*/
--
-- ============================================================================
-- AVATARS BUCKET POLICIES
-- ============================================================================
--
-- Policy 1: "Allow public to view avatars"
-- Operation: SELECT
-- Target roles: public (anon, authenticated)
-- Policy definition:
/*
bucket_id = 'avatars'
*/
--
-- Policy 2: "Allow users to upload their own avatar"
-- Operation: INSERT
-- Target roles: authenticated
-- Policy definition:
/*
(bucket_id = 'avatars') AND 
((string_to_array(name, '.'))[1] = (auth.uid())::text)
*/
--
-- Policy 3: "Allow users to update their own avatar"
-- Operation: UPDATE
-- Target roles: authenticated
-- Policy definition:
/*
(bucket_id = 'avatars') AND 
((string_to_array(name, '.'))[1] = (auth.uid())::text)
*/
--
-- Policy 4: "Allow users to delete their own avatar"
-- Operation: DELETE
-- Target roles: authenticated
-- Policy definition:
/*
(bucket_id = 'avatars') AND 
((string_to_array(name, '.'))[1] = (auth.uid())::text)
*/
--
-- ============================================================================
-- ASSETS BUCKET POLICIES
-- ============================================================================
--
-- Policy 1: "Allow public to view assets"
-- Operation: SELECT
-- Target roles: public (anon, authenticated)
-- Policy definition:
/*
bucket_id = 'assets'
*/
--
-- Policy 2: "Allow admins to manage assets"
-- Operation: ALL (INSERT, UPDATE, DELETE)
-- Target roles: authenticated
-- Policy definition:
/*
(bucket_id = 'assets') AND public.is_admin()
*/
--
-- ============================================================================
-- ALTERNATIVE: Quick Setup via Supabase CLI (Local Development)
-- ============================================================================
-- If using Supabase CLI locally, add this to supabase/config.toml:
--
-- [storage]
-- enabled = true
--
-- [[storage.buckets]]
-- id = "report-photos"
-- name = "report-photos"
-- public = false
-- file_size_limit = "5MB"
-- allowed_mime_types = ["image/jpeg", "image/png", "image/webp", "image/heic"]
--
-- [[storage.buckets]]
-- id = "avatars"
-- name = "avatars"
-- public = true
-- file_size_limit = "2MB"
-- allowed_mime_types = ["image/jpeg", "image/png", "image/webp"]
--
-- [[storage.buckets]]
-- id = "assets"
-- name = "assets"
-- public = true
-- file_size_limit = "1MB"
-- allowed_mime_types = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]
--
-- ============================================================================
-- PHOTO PATH CONVENTIONS
-- ============================================================================
--
-- 1. Report Photos:
--    - Original: report-photos/{neighborhood_id}/{user_id}/{report_id}_original.jpg
--    - Thumbnail: report-photos/{neighborhood_id}/{user_id}/{report_id}_thumb.jpg
--    - Completion: report-photos/{neighborhood_id}/{user_id}/{report_id}_completion.jpg
--
-- 2. Avatars:
--    - {user_id}.jpg
--
-- 3. Assets (admin-managed):
--    - badges/{badge_slug}.png
--    - challenges/{challenge_id}.jpg
--
-- ============================================================================
