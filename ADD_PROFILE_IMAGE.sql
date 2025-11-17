-- Add profile_image_url column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Create storage bucket for profile images if it doesn't exist
-- Run this in Supabase SQL Editor or Dashboard

-- Note: You'll also need to create a storage bucket called 'profile-images' 
-- in the Supabase Dashboard under Storage

-- Set up RLS policies for profile-images bucket
-- These should be created in Supabase Dashboard Storage settings:

-- Policy 1: Allow authenticated users to upload their own profile images
-- Name: "Users can upload their own profile image"
-- Allowed operations: INSERT
-- Policy definition: (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1])

-- Policy 2: Allow everyone to view profile images
-- Name: "Public profile images are viewable by everyone"
-- Allowed operations: SELECT
-- Policy definition: bucket_id = 'profile-images'

-- Policy 3: Allow users to update their own profile images
-- Name: "Users can update their own profile image"
-- Allowed operations: UPDATE
-- Policy definition: (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1])

-- Policy 4: Allow users to delete their own profile images
-- Name: "Users can delete their own profile image"
-- Allowed operations: DELETE
-- Policy definition: (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1])

-- Update profiles RLS policy to allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
