-- Fix infinite recursion in roles table RLS policies
-- Run this in Supabase SQL Editor

-- Step 1: Drop the problematic policy
DROP POLICY IF EXISTS "Only admins can manage roles" ON roles;

-- Step 2: Create separate policies for each operation (no JOIN on roles table)
CREATE POLICY "Only admins can insert roles" 
  ON roles FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role_id = (SELECT id FROM roles WHERE name = 'admin' LIMIT 1)
    )
  );

CREATE POLICY "Only admins can update roles" 
  ON roles FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role_id = (SELECT id FROM roles WHERE name = 'admin' LIMIT 1)
    )
  );

CREATE POLICY "Only admins can delete roles" 
  ON roles FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role_id = (SELECT id FROM roles WHERE name = 'admin' LIMIT 1)
    )
  );

-- Verify policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'roles';
