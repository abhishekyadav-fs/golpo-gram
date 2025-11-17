# Audio Story Feature Setup Guide

This guide provides step-by-step instructions for setting up the audio story feature in Golpogram.

## Overview

The audio story feature allows users to:
1. **Record audio** directly in the browser using the MediaRecorder API
2. **Upload audio files** in common formats (MP3, WAV, OGG, M4A, AAC)
3. **Preview audio** before submitting
4. **Store audio files** in Supabase Storage

## Database Setup

### Step 1: Run the Migration

Execute the migration file to add audio story support:

```sql
-- Run this in Supabase SQL Editor
-- File: supabase-migrations/add-audio-story-support.sql
```

Or copy and paste the following SQL:

```sql
-- Add story_type column
ALTER TABLE stories
ADD COLUMN story_type TEXT NOT NULL DEFAULT 'text' CHECK (story_type IN ('text', 'audio'));

-- Add audio_url column
ALTER TABLE stories
ADD COLUMN audio_url TEXT;

-- Add duration column
ALTER TABLE stories
ADD COLUMN audio_duration INTEGER;

-- Make content nullable
ALTER TABLE stories
ALTER COLUMN content DROP NOT NULL;

-- Add constraint
ALTER TABLE stories
ADD CONSTRAINT check_story_content 
CHECK (
  (story_type = 'text' AND content IS NOT NULL AND content != '') 
  OR 
  (story_type = 'audio' AND audio_url IS NOT NULL AND audio_url != '')
);

-- Create index
CREATE INDEX idx_stories_type ON stories(story_type);
```

### Step 2: Create Storage Bucket

#### Option 1: Using Supabase Dashboard

1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Name: `audio-stories`
4. Set **Public bucket** to `ON`
5. Click **Create bucket**

#### Option 2: Using SQL

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-stories', 'audio-stories', true)
ON CONFLICT (id) DO NOTHING;
```

### Step 3: Set Up RLS Policies

Add these policies to the `storage.objects` table:

```sql
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

-- Allow public read access
CREATE POLICY "Public access to audio files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audio-stories');
```

## Feature Usage

### For Users

1. Navigate to **Create Story** page
2. Choose between:
   - **Write Story**: Traditional text-based story with optional images/videos
   - **Audio Story**: Voice-recorded or uploaded audio story

#### Recording Audio

1. Click **Record Audio**
2. Grant microphone permissions when prompted
3. Speak your story
4. Click **Stop Recording** when finished
5. Preview the recording
6. Submit or re-record if needed

#### Uploading Audio

1. Click **Upload Audio File**
2. Select an audio file from your device
3. Supported formats: MP3, WAV, OGG, M4A, AAC
4. Preview the audio
5. Submit the story

### Supported Audio Formats

| Format | MIME Type | Extension |
|--------|-----------|-----------|
| MP3 | audio/mpeg | .mp3 |
| WAV | audio/wav | .wav |
| OGG | audio/ogg | .ogg |
| M4A | audio/m4a | .m4a |
| AAC | audio/aac | .aac |
| WebM | audio/webm | .webm (recordings) |

## Technical Details

### Frontend Components

**Files Modified:**
- `src/app/components/create-story/create-story.component.ts`
- `src/app/components/create-story/create-story.component.html`
- `src/app/components/create-story/create-story.component.scss`
- `src/app/services/story.service.ts`
- `src/app/models/story.model.ts`

### Key Features

1. **MediaRecorder API**: Browser-based audio recording
2. **Real-time Visualizer**: Animated bars during recording
3. **Duration Tracking**: Shows recording time in MM:SS format
4. **File Validation**: Accepts only audio formats
5. **Preview Before Submit**: Play back audio before submission

### Storage Structure

Audio files are stored in the following pattern:
```
audio-stories/
  {user_id}/
    {timestamp}_{random}.{extension}
```

Example: `audio-stories/uuid-123/1700000000000_abc123.mp3`

### Database Schema

```sql
stories {
  id: UUID (primary key)
  title: TEXT (required)
  content: TEXT (nullable - required only for text stories)
  story_type: TEXT ('text' | 'audio', default: 'text')
  audio_url: TEXT (nullable - required only for audio stories)
  audio_duration: INTEGER (seconds)
  locality_id: UUID (foreign key)
  author_id: UUID (foreign key)
  status: TEXT ('pending' | 'approved' | 'rejected')
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

## Browser Compatibility

The MediaRecorder API is supported in:
- Chrome/Edge 49+
- Firefox 25+
- Safari 14.1+
- Opera 36+

For older browsers, the upload option will still work.

## Troubleshooting

### Microphone Permission Denied

**Problem**: User denies microphone access

**Solution**: 
1. Guide users to browser settings to enable microphone
2. Provide alternative upload option

### Audio File Too Large

**Problem**: Upload fails due to file size

**Solution**:
- Current limit: Based on Supabase plan
- Recommend users to compress audio files
- Consider adding client-side compression

### Audio Not Playing

**Problem**: Audio preview doesn't work

**Solution**:
1. Check browser console for errors
2. Verify audio format is supported
3. Check Supabase storage bucket is public
4. Verify RLS policies are correctly set

### Recording Not Working

**Problem**: MediaRecorder fails to start

**Solution**:
1. Check browser compatibility
2. Ensure HTTPS connection (required for getUserMedia)
3. Check microphone permissions
4. Try different browser

## Future Enhancements

Potential improvements:
- [ ] Audio waveform visualization during playback
- [ ] Noise cancellation during recording
- [ ] Audio trimming/editing before upload
- [ ] Multiple audio formats for download
- [ ] Transcription using speech-to-text API
- [ ] Audio quality/bitrate settings
- [ ] Background music/effects

## Security Considerations

1. **File Size Limits**: Implement max file size validation
2. **Format Validation**: Server-side MIME type verification
3. **RLS Policies**: Users can only modify their own files
4. **Content Moderation**: Audio stories go through same approval process
5. **Storage Cleanup**: Consider auto-deletion of rejected stories

## Support

For issues or questions:
1. Check browser console for errors
2. Verify Supabase configuration
3. Check RLS policies are correctly applied
4. Review network tab for failed requests
