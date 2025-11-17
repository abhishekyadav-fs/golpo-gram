-- Fix RLS policy for profiles table to allow user registration
-- Run this in Supabase SQL Editor

-- Add policy to allow users to insert their own profile during signup
CREATE POLICY "Users can insert own profile on signup" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'profiles';
