-- =====================================================
-- STORYTELLER PROFILE FEATURE
-- =====================================================
-- This migration adds storyteller profile functionality
-- Storytellers are users who have created at least one story
-- =====================================================

-- Add storyteller profile fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_storyteller BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS storyteller_name TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS storyteller_bio TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS storyteller_photo_url TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS story_count INTEGER DEFAULT 0;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS first_story_date TIMESTAMP;

-- Create index for storyteller search
CREATE INDEX IF NOT EXISTS idx_profiles_storyteller ON profiles(is_storyteller) WHERE is_storyteller = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_storyteller_name ON profiles(storyteller_name) WHERE storyteller_name IS NOT NULL;

-- Function to automatically make user a storyteller when they create their first story
CREATE OR REPLACE FUNCTION make_user_storyteller()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile to storyteller status on first story
  UPDATE profiles
  SET 
    is_storyteller = TRUE,
    storyteller_name = COALESCE(storyteller_name, full_name),
    first_story_date = COALESCE(first_story_date, NEW.created_at),
    story_count = (
      SELECT COUNT(*) 
      FROM stories 
      WHERE author_id = NEW.author_id
    )
  WHERE id = NEW.author_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to make user a storyteller when they create a story
DROP TRIGGER IF EXISTS trigger_make_storyteller ON stories;
CREATE TRIGGER trigger_make_storyteller
AFTER INSERT ON stories
FOR EACH ROW
EXECUTE FUNCTION make_user_storyteller();

-- Function to update story count
CREATE OR REPLACE FUNCTION update_story_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update story count on story approval
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE profiles
    SET story_count = (
      SELECT COUNT(*) 
      FROM stories 
      WHERE author_id = NEW.author_id AND status = 'approved'
    )
    WHERE id = NEW.author_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update story count on story status change
DROP TRIGGER IF EXISTS trigger_update_story_count ON stories;
CREATE TRIGGER trigger_update_story_count
AFTER UPDATE OF status ON stories
FOR EACH ROW
EXECUTE FUNCTION update_story_count();

-- RLS Policies for storyteller profiles
-- Everyone can view storyteller profiles (public)
CREATE POLICY IF NOT EXISTS "Public can view storyteller profiles"
ON profiles FOR SELECT
TO public
USING (is_storyteller = TRUE);

-- Users can update their own storyteller profile
CREATE POLICY IF NOT EXISTS "Users can update their storyteller profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Create a view for public storyteller profiles
CREATE OR REPLACE VIEW public_storytellers AS
SELECT 
  id,
  full_name,
  storyteller_name,
  storyteller_bio,
  storyteller_photo_url,
  story_count,
  first_story_date,
  created_at
FROM profiles
WHERE is_storyteller = TRUE
ORDER BY story_count DESC, first_story_date DESC;

-- Grant access to the view
GRANT SELECT ON public_storytellers TO authenticated, anon;

-- Add comments for documentation
COMMENT ON COLUMN profiles.is_storyteller IS 'True if user has created at least one story';
COMMENT ON COLUMN profiles.storyteller_name IS 'Public display name for the storyteller (defaults to full_name)';
COMMENT ON COLUMN profiles.storyteller_bio IS 'Short biography describing the storyteller work';
COMMENT ON COLUMN profiles.storyteller_photo_url IS 'URL to storyteller profile photo';
COMMENT ON COLUMN profiles.story_count IS 'Number of approved stories by this storyteller';
COMMENT ON COLUMN profiles.first_story_date IS 'Date when the user created their first story';

-- =====================================================
-- INITIALIZATION (Optional)
-- =====================================================
-- Update existing users who already have stories to storyteller status
UPDATE profiles
SET 
  is_storyteller = TRUE,
  storyteller_name = COALESCE(storyteller_name, full_name),
  story_count = (
    SELECT COUNT(*) 
    FROM stories 
    WHERE author_id = profiles.id AND status = 'approved'
  ),
  first_story_date = (
    SELECT MIN(created_at) 
    FROM stories 
    WHERE author_id = profiles.id
  )
WHERE id IN (
  SELECT DISTINCT author_id 
  FROM stories
);
