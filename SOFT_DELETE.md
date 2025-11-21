# Soft Delete Implementation

## Overview
All admin deletion operations in Golpo Gram use soft delete instead of hard delete. This means records are marked as deleted but remain in the database for audit purposes and potential recovery.

## Database Schema

### Soft Delete Columns

Both `profiles` and `stories` tables have soft delete columns:

```sql
-- Profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);

-- Stories table
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);
```

**Columns:**
- `deleted_at` - Timestamp when the record was soft deleted (NULL = active)
- `deleted_by` - UUID of the admin user who performed the deletion

### Indexes

Indexes are created for efficient querying:
```sql
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_stories_deleted_at ON stories(deleted_at);
```

## Row Level Security (RLS) Updates

All RLS policies have been updated to exclude soft-deleted records:

### Profiles Policies
```sql
-- Users can only see non-deleted profiles
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL AND (is_admin() OR id = auth.uid())
);

-- Users can only update non-deleted profiles
CREATE POLICY "Admins can update any profile"
ON profiles FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL AND (is_admin() OR id = auth.uid())
);
```

### Stories Policies
```sql
-- Only show non-deleted stories
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

-- Only allow updates to non-deleted stories
CREATE POLICY "Moderators can update story status"
ON stories FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL AND is_moderator_or_admin()
);
```

## Service Layer Implementation

### AdminService

**Soft Delete User:**
```typescript
async deleteUser(request: DeleteUserRequest): Promise<void> {
  const currentUser = await this.supabase.auth.getUser();
  
  // Soft delete user's stories first
  await this.supabase
    .from('stories')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: currentUser.data.user.id
    })
    .eq('author_id', request.user_id)
    .is('deleted_at', null);

  // Soft delete profile
  await this.supabase
    .from('profiles')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: currentUser.data.user.id
    })
    .eq('id', request.user_id)
    .is('deleted_at', null);

  await this.logAdminAction('delete_user', request.user_id, request.reason);
}
```

**Soft Delete Story:**
```typescript
async deleteStory(storyId: string): Promise<void> {
  const currentUser = await this.supabase.auth.getUser();

  // Soft delete the story
  await this.supabase
    .from('stories')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: currentUser.data.user.id
    })
    .eq('id', storyId)
    .is('deleted_at', null);

  await this.logAdminAction('delete_story', storyId);
  
  // Publish event for real-time updates
  this.eventBus.publish({
    type: EventType.STORY_DELETED,
    payload: { storyId, authorId: story?.author_id }
  });
}
```

### StoryService

All story queries automatically exclude soft-deleted records:

```typescript
// Get stories by locality
async getStoriesByLocality(localityId: string, status: string = 'approved'): Promise<Story[]> {
  const { data, error } = await this.supabase
    .from('stories')
    .select('...')
    .eq('locality_id', localityId)
    .eq('status', status)
    .is('deleted_at', null)  // Exclude soft-deleted
    .order('created_at', { ascending: false });
}

// Get user's stories
async getMyStories(): Promise<Story[]> {
  const { data, error } = await this.supabase
    .from('stories')
    .select('...')
    .eq('author_id', user.id)
    .is('deleted_at', null)  // Exclude soft-deleted
    .order('created_at', { ascending: false });
}

// Get pending stories for moderation
async getPendingStories(): Promise<Story[]> {
  const { data, error } = await this.supabase
    .from('stories')
    .select('...')
    .eq('status', 'pending')
    .is('deleted_at', null)  // Exclude soft-deleted
    .order('created_at', { ascending: true });
}
```

## Query Patterns

### Exclude Soft-Deleted Records
All queries should include `.is('deleted_at', null)`:

```typescript
// Correct
await this.supabase
  .from('profiles')
  .select('*')
  .is('deleted_at', null);

// Incorrect - will include deleted records
await this.supabase
  .from('profiles')
  .select('*');
```

### Prevent Double Deletion
Use `.is('deleted_at', null)` in WHERE clause when soft deleting:

```typescript
// Correct - only soft delete if not already deleted
await this.supabase
  .from('stories')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', storyId)
  .is('deleted_at', null);  // Important!
```

## Benefits

1. **Data Retention**: Deleted records remain in database for audit/compliance
2. **Audit Trail**: Track who deleted what and when (`deleted_by`, `deleted_at`)
3. **Recovery**: Possible to restore accidentally deleted records
4. **Referential Integrity**: Foreign key relationships remain intact
5. **Historical Analysis**: Can analyze deleted data for insights

## Admin Actions Logged

All soft delete operations are logged in `admin_logs`:
- `delete_user` - User/storyteller deleted
- `delete_story` - Story deleted
- Includes reason (if provided) and timestamp

## Recovery Process

To restore a soft-deleted record (manual SQL):

```sql
-- Restore a user profile
UPDATE profiles
SET deleted_at = NULL, deleted_by = NULL
WHERE id = 'user-uuid';

-- Restore a story
UPDATE stories
SET deleted_at = NULL, deleted_by = NULL
WHERE id = 'story-uuid';

-- Restore all stories by a user
UPDATE stories
SET deleted_at = NULL, deleted_by = NULL
WHERE author_id = 'user-uuid' AND deleted_at IS NOT NULL;
```

## Hard Delete (When Needed)

For permanent deletion (e.g., GDPR compliance):

```sql
-- Hard delete a user and their stories
DELETE FROM media_files WHERE story_id IN (
  SELECT id FROM stories WHERE author_id = 'user-uuid'
);
DELETE FROM stories WHERE author_id = 'user-uuid';
DELETE FROM profiles WHERE id = 'user-uuid';
```

**Note:** Hard deletes should be rare and require special authorization.

## Best Practices

1. ✅ Always check `deleted_at IS NULL` in queries
2. ✅ Set both `deleted_at` AND `deleted_by` when soft deleting
3. ✅ Use `.is('deleted_at', null)` in UPDATE/DELETE operations
4. ✅ Log all deletion actions in `admin_logs`
5. ✅ Publish events for real-time UI updates
6. ❌ Never hard delete unless absolutely necessary
7. ❌ Don't forget to soft delete related records (e.g., user's stories)

## Testing Checklist

- [ ] Soft-deleted users don't appear in admin user list
- [ ] Soft-deleted storytellers don't appear in storyteller list
- [ ] Soft-deleted stories don't appear in feeds
- [ ] Soft-deleted stories don't appear in "My Stories"
- [ ] Soft-deleted stories don't appear in storyteller's story list
- [ ] Soft-deleted stories don't count toward storyteller stats
- [ ] `deleted_by` is set correctly to admin user ID
- [ ] `deleted_at` timestamp is accurate
- [ ] Admin logs record deletion with reason
- [ ] Cannot soft delete already soft-deleted records
- [ ] Event bus publishes deletion events
- [ ] UI updates in real-time after deletion

## Migration Script

The soft delete columns are added in `database/migrations/add-admin-module.sql`:
```sql
-- Run this to add soft delete support
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);

ALTER TABLE stories
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);
```
