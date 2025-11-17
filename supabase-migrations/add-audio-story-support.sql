-- Migration: Add support for audio stories
-- This migration adds columns to support audio-only stories

-- Add story_type column to differentiate between text and audio stories
ALTER TABLE stories
ADD COLUMN story_type TEXT NOT NULL DEFAULT 'text' CHECK (story_type IN ('text', 'audio'));

-- Add audio_url column for storing the primary audio file URL for audio stories
ALTER TABLE stories
ADD COLUMN audio_url TEXT;

-- Add duration column for audio stories (in seconds)
ALTER TABLE stories
ADD COLUMN audio_duration INTEGER;

-- Make content nullable since audio stories don't require text content
ALTER TABLE stories
ALTER COLUMN content DROP NOT NULL;

-- Add constraint: text stories must have content, audio stories must have audio_url
ALTER TABLE stories
ADD CONSTRAINT check_story_content 
CHECK (
  (story_type = 'text' AND content IS NOT NULL AND content != '') 
  OR 
  (story_type = 'audio' AND audio_url IS NOT NULL AND audio_url != '')
);

-- Create storage bucket for audio stories
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-stories', 'audio-stories', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for audio-stories bucket
-- Allow authenticated users to upload their own audio files
CREATE POLICY "Users can upload their own audio files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio-stories' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own audio files
CREATE POLICY "Users can update their own audio files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'audio-stories' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own audio files
CREATE POLICY "Users can delete their own audio files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'audio-stories' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all audio files
CREATE POLICY "Public access to audio files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audio-stories');

-- Add index for story_type for efficient filtering
CREATE INDEX idx_stories_type ON stories(story_type);

-- Add comment for documentation
COMMENT ON COLUMN stories.story_type IS 'Type of story: text (traditional written story) or audio (voice recording)';
COMMENT ON COLUMN stories.audio_url IS 'URL to the audio file in Supabase storage (for audio stories only)';
COMMENT ON COLUMN stories.audio_duration IS 'Duration of audio file in seconds (for audio stories only)';
