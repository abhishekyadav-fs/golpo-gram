-- =====================================================
-- TRUNCATE ALL TABLES - SUPABASE DATABASE
-- =====================================================
-- WARNING: This will delete ALL data from all tables!
-- Use with extreme caution, preferably only in development/testing.
-- =====================================================

-- Disable foreign key constraints temporarily
SET session_replication_role = 'replica';

-- Truncate all tables in order (respecting dependencies)
TRUNCATE TABLE media_files CASCADE;
TRUNCATE TABLE stories CASCADE;
TRUNCATE TABLE localities CASCADE;
TRUNCATE TABLE profiles CASCADE;

-- Re-enable foreign key constraints
SET session_replication_role = 'origin';

-- Optional: Reset sequences to start from 1
-- (Uncomment if you want IDs to restart from 1)
-- ALTER SEQUENCE IF EXISTS media_files_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS stories_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS localities_id_seq RESTART WITH 1;

-- Verify truncation
SELECT 'media_files' as table_name, COUNT(*) as row_count FROM media_files
UNION ALL
SELECT 'stories', COUNT(*) FROM stories
UNION ALL
SELECT 'localities', COUNT(*) FROM localities
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles;

-- =====================================================
-- NOTES:
-- 1. CASCADE option automatically truncates dependent tables
-- 2. Profiles table is truncated last as it depends on auth.users
-- 3. This does NOT delete users from auth.users table
-- 4. Storage bucket files are NOT deleted by this script
-- =====================================================
