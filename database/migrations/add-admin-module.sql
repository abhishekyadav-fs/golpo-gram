-- Add admin and moderator fields to profiles table
-- Run this SQL in your Supabase SQL Editor

-- 1. Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_moderator BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- 2. Create admin_logs table for tracking admin actions
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create index on admin_logs for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target_user_id ON admin_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- 4. Add is_blocked column to profiles if not exists
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- 4.1 Add soft delete columns to profiles and stories tables
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);

ALTER TABLE stories
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);

-- 4.2 Create indexes for soft delete queries
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_stories_deleted_at ON stories(deleted_at);

-- 5. Create a helper function to check if current user is admin
-- This function uses SECURITY DEFINER to bypass RLS and prevent infinite recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create a helper function to check if current user is moderator or admin
CREATE OR REPLACE FUNCTION is_moderator_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (is_moderator = true OR is_admin = true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update RLS policies for admin access using helper functions

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL AND (is_admin() OR id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile"
ON profiles FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL AND (is_admin() OR id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can delete any profile" ON profiles;
CREATE POLICY "Admins can delete any profile"
ON profiles FOR DELETE
TO authenticated
USING (
  is_admin()
);

-- 8. Create RLS policies for admin_logs

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert admin logs" ON admin_logs;
CREATE POLICY "Admins can insert admin logs"
ON admin_logs FOR INSERT
TO authenticated
WITH CHECK (
  is_admin()
);

DROP POLICY IF EXISTS "Admins can view admin logs" ON admin_logs;
CREATE POLICY "Admins can view admin logs"
ON admin_logs FOR SELECT
TO authenticated
USING (
  is_admin()
);

-- 9. Create a function to update last_login timestamp
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET last_login = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create trigger to update last_login on auth.users update
-- Note: This requires access to auth schema, which may need to be set up manually

-- 11. Grant necessary permissions
GRANT SELECT ON admin_logs TO authenticated;
GRANT INSERT ON admin_logs TO authenticated;

-- 12. Make your first user an admin (replace 'YOUR_USER_EMAIL' with actual email)
-- UPDATE profiles SET is_admin = true WHERE email = 'YOUR_USER_EMAIL';

-- Example: To make the first registered user an admin
-- UPDATE profiles SET is_admin = true WHERE id = (
--   SELECT id FROM profiles ORDER BY created_at LIMIT 1
-- );

-- 13. Moderators can view and update stories
DROP POLICY IF EXISTS "Moderators can view all stories" ON stories;
CREATE POLICY "Moderators can view all stories"
ON stories FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL AND (
    status = 'approved'
    OR author_id = auth.uid()
    OR is_moderator_or_admin()
  )
);

DROP POLICY IF EXISTS "Moderators can update story status" ON stories;
CREATE POLICY "Moderators can update story status"
ON stories FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL AND is_moderator_or_admin()
);

-- 14. Add reviewed_by and reviewed_at columns to stories if not exists
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- 15. Create function to track moderation activity
CREATE OR REPLACE FUNCTION track_moderation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    NEW.reviewed_by = auth.uid();
    NEW.reviewed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Create trigger for moderation tracking
DROP TRIGGER IF EXISTS track_moderation_trigger ON stories;
CREATE TRIGGER track_moderation_trigger
BEFORE UPDATE ON stories
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION track_moderation();

-- IMPORTANT NOTES:
-- 1. After running this migration, manually set at least one user as admin:
--    UPDATE profiles SET is_admin = true WHERE email = 'your-admin-email@example.com';
--
-- 2. The admin user will have full access to the Bird Eye admin panel
--
-- 3. Admins can then promote other users to moderators through the UI
--
-- 4. Consider adding additional security measures like IP whitelisting for admin access
