-- Fix RLS policies to allow soft delete operations by admins
-- This migration adds proper policies for UPDATE operations that include deleted_at

-- Drop the existing update policy and recreate with soft delete support
DROP POLICY IF EXISTS "Moderators can update story status" ON stories;

-- Policy for moderators/admins to update story fields (status, moderator_notes, etc.)
-- Also allows admins to perform soft deletes
CREATE POLICY "Moderators can update story status"
ON stories FOR UPDATE
TO authenticated
USING (
  is_moderator_or_admin() OR author_id = auth.uid()
)
WITH CHECK (
  is_moderator_or_admin() OR author_id = auth.uid()
);

-- Similarly update profiles policy to allow soft delete
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

CREATE POLICY "Admins can update any profile"
ON profiles FOR UPDATE
TO authenticated
USING (
  is_admin() OR id = auth.uid()
)
WITH CHECK (
  is_admin() OR id = auth.uid()
);

-- NOTES:
-- This migration fixes the RLS policies to allow admins to perform soft deletes
-- by updating the deleted_at column while maintaining security for other updates
