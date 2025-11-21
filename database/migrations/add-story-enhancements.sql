-- Migration: Add story enhancements (cover, description, characters, genre, tags, language)
-- This migration adds new fields to stories table and creates supporting tables

-- 1. Add new columns to stories table
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS main_characters TEXT[], -- Array of character names
ADD COLUMN IF NOT EXISTS genre TEXT,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- 2. Create genres table for pre-populated genre list
CREATE TABLE IF NOT EXISTS genres (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create story_tags table for tagging system
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, tag_id)
);

-- 4. Create story_images table for inline images in rich text
CREATE TABLE IF NOT EXISTS story_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_caption TEXT,
  image_order INTEGER DEFAULT 0,
  file_size INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Insert predefined genres
INSERT INTO genres (name, description) VALUES
  ('Fiction', 'Imaginative or invented stories'),
  ('Non-Fiction', 'Factual and real-life stories'),
  ('Mystery', 'Stories involving suspense and solving puzzles'),
  ('Romance', 'Love and relationship-focused stories'),
  ('Adventure', 'Exciting journeys and explorations'),
  ('Horror', 'Scary and frightening narratives'),
  ('Comedy', 'Humorous and entertaining stories'),
  ('Drama', 'Serious and emotional narratives'),
  ('Fantasy', 'Stories with magical or supernatural elements'),
  ('Science Fiction', 'Stories exploring futuristic or scientific themes'),
  ('Biography', 'Life stories of real people'),
  ('Historical', 'Stories set in the past'),
  ('Folklore', 'Traditional stories and legends'),
  ('Personal Experience', 'First-hand accounts and memories'),
  ('Other', 'Miscellaneous genres')
ON CONFLICT (name) DO NOTHING;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stories_genre ON stories(genre);
CREATE INDEX IF NOT EXISTS idx_stories_language ON stories(language);
CREATE INDEX IF NOT EXISTS idx_story_tags_story_id ON story_tags(story_id);
CREATE INDEX IF NOT EXISTS idx_story_tags_tag_id ON story_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_story_images_story_id ON story_images(story_id);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON tags(usage_count DESC);

-- 7. Create storage bucket for story covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-covers', 'story-covers', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Create storage bucket for story inline images
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-images', 'story-images', true)
ON CONFLICT (id) DO NOTHING;

-- 9. RLS Policies for story-covers bucket
CREATE POLICY "Users can upload their own story covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'story-covers' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own story covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'story-covers' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view story covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'story-covers');

CREATE POLICY "Users can delete their own story covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'story-covers' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 10. RLS Policies for story-images bucket
CREATE POLICY "Users can upload their own story images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'story-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own story images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'story-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view story images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'story-images');

CREATE POLICY "Users can delete their own story images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'story-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 11. RLS Policies for tags table
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tags"
ON tags FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create tags"
ON tags FOR INSERT
TO authenticated
WITH CHECK (true);

-- 12. RLS Policies for story_tags table
ALTER TABLE story_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view story tags"
ON story_tags FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Story authors can add tags to their stories"
ON story_tags FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM stories
    WHERE stories.id = story_tags.story_id
    AND stories.author_id = auth.uid()
  )
);

CREATE POLICY "Story authors can remove tags from their stories"
ON story_tags FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stories
    WHERE stories.id = story_tags.story_id
    AND stories.author_id = auth.uid()
  )
);

-- 13. RLS Policies for story_images table
ALTER TABLE story_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view story images"
ON story_images FOR SELECT
TO public
USING (true);

CREATE POLICY "Story authors can add images to their stories"
ON story_images FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM stories
    WHERE stories.id = story_images.story_id
    AND stories.author_id = auth.uid()
  )
);

CREATE POLICY "Story authors can delete images from their stories"
ON story_images FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stories
    WHERE stories.id = story_images.story_id
    AND stories.author_id = auth.uid()
  )
);

-- 14. Create function to update tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Create trigger for tag usage count
DROP TRIGGER IF EXISTS update_tag_usage_count_trigger ON story_tags;
CREATE TRIGGER update_tag_usage_count_trigger
AFTER INSERT OR DELETE ON story_tags
FOR EACH ROW
EXECUTE FUNCTION update_tag_usage_count();

-- NOTES:
-- 1. Cover images are stored in 'story-covers' bucket
-- 2. Inline rich text images are stored in 'story-images' bucket (max 5 images, 2MB each)
-- 3. Tags are stored in a many-to-many relationship with stories
-- 4. Genres are predefined and stored in the genres table
-- 5. Main characters are stored as TEXT array (PostgreSQL array type)
-- 6. Language defaults to 'en' (English) but can be changed
-- 7. Description provides a summary/preview of the story (both text and audio)
