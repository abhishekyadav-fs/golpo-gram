# Storyteller Profile Feature - Implementation Guide

## Overview
This feature automatically creates a storyteller profile when a user creates their first story. Storyteller profiles are public and searchable.

## Database Changes Required

### 1. Run the SQL Migration
Execute the file: `supabase-migrations/add-storyteller-profiles.sql`

This migration will:
- Add storyteller fields to the `profiles` table
- Create triggers to automatically promote users to storytellers
- Set up RLS policies for public access
- Create a `public_storytellers` view
- Update existing users who have stories

### 2. Verify the Changes

After running the migration, verify:

```sql
-- Check that new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('is_storyteller', 'storyteller_name', 'storyteller_bio', 'storyteller_photo_url', 'story_count', 'first_story_date');

-- Check that triggers exist
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'stories';

-- View current storytellers
SELECT * FROM public_storytellers;
```

## Features Implemented

### 1. Automatic Storyteller Promotion
- When a user creates their first story, they automatically become a storyteller
- `storyteller_name` defaults to their `full_name`
- `story_count` is automatically maintained
- `first_story_date` records when they became a storyteller

### 2. Storyteller Profile Page (`/storyteller/:id`)
- Shows storyteller photo (or default avatar)
- Displays storyteller name and bio
- Shows story count and member since date
- Lists all approved stories by the storyteller
- Supports both text and audio stories

### 3. Search by Storyteller
- Search box in the feed to filter stories by storyteller name
- Real-time filtering as user types
- Clear button to reset search

### 4. Clickable Author Names
- Author names in feed are now clickable links
- Click takes user to storyteller profile page
- Shows all stories by that author

## Profile Fields

| Field | Type | Description |
|-------|------|-------------|
| `is_storyteller` | BOOLEAN | True if user has created at least one story |
| `storyteller_name` | TEXT | Public display name (defaults to full_name) |
| `storyteller_bio` | TEXT | Short biography describing their work |
| `storyteller_photo_url` | TEXT | URL to profile photo in Supabase storage |
| `story_count` | INTEGER | Number of approved stories |
| `first_story_date` | TIMESTAMP | Date of first story creation |

## User Flow

### Becoming a Storyteller
1. User signs up and creates account
2. User creates their first story
3. **Trigger fires**: User automatically becomes a storyteller
4. Profile updated with:
   - `is_storyteller = TRUE`
   - `storyteller_name = full_name`
   - `story_count = 1`
   - `first_story_date = now()`

### Viewing a Storyteller
1. User sees a story in the feed
2. Clicks on the author name
3. Navigates to `/storyteller/:id`
4. Sees:
   - Storyteller photo and name
   - Biography (if added)
   - Stats (story count, member since)
   - All approved stories by this author

### Searching for Storytellers
1. User types in search box in feed
2. Stories are filtered in real-time
3. Only stories by matching storytellers are shown
4. Clear button resets the filter

## API Endpoints

### StorytellerService Methods
- `getStorytellerProfile(userId)` - Get profile by user ID
- `getAllStorytellers()` - Get all storytellers (ordered by story count)
- `searchStorytellers(searchTerm)` - Search by name
- `updateStorytellerProfile(userId, updates)` - Update bio/name/photo
- `uploadStorytellerPhoto(userId, file)` - Upload profile photo

### StoryService Methods
- `getStoriesByAuthor(authorId, status)` - Get all stories by an author

## Future Enhancements

### Storyteller Profile Editing
Users could edit their storyteller profile:
- Change storyteller_name
- Add/update bio
- Upload profile photo

### Storyteller Directory
A dedicated page showing all storytellers:
- Grid/list view
- Sort by story count or join date
- Filter by locality

### Storyteller Badges
Recognition badges for:
- Story milestones (10, 50, 100 stories)
- Community favorites
- Long-time members

## Testing Checklist

- [ ] User becomes storyteller after first story creation
- [ ] Story count increments correctly
- [ ] Author names are clickable in feed
- [ ] Storyteller profile page loads correctly
- [ ] All stories by author are displayed
- [ ] Search by storyteller filters correctly
- [ ] Default avatar shows when no photo uploaded
- [ ] Mobile responsive design works
- [ ] Public access works (no auth required to view)

## Security Notes

- Storyteller profiles are **public** - no authentication required
- Only authenticated users can update their own profile
- Story count is automatically maintained by triggers
- RLS policies ensure data integrity
