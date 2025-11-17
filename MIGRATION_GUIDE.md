# Database Migration Guide: Roles Table

## Overview

This migration refactors the database to use a separate `roles` table instead of storing role as a string column in the `profiles` table. This provides better normalization and makes role management more flexible.

## Changes

### Before (Old Schema)
```sql
profiles (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT CHECK (role IN ('user', 'moderator', 'admin'))
)
```

### After (New Schema)
```sql
roles (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE,
  description TEXT
)

profiles (
  id UUID,
  email TEXT,
  full_name TEXT,
  role_id UUID REFERENCES roles(id)
)
```

## Migration Steps

### For New Installations
Simply follow the setup in `SUPABASE_SETUP.md`. The roles table is created automatically.

### For Existing Installations

⚠️ **IMPORTANT**: Backup your database before proceeding!

#### Step 1: Create Roles Table

```sql
-- Create roles table
CREATE TABLE roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE CHECK (name IN ('user', 'moderator', 'admin')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('user', 'Regular user who can create and view stories'),
  ('moderator', 'Can review and approve/reject stories'),
  ('admin', 'Full access including managing localities and roles');

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Roles are viewable by everyone" 
  ON roles FOR SELECT 
  USING (true);
```

#### Step 2: Add New Column to Profiles

```sql
-- Add the new role_id column (nullable at first)
ALTER TABLE profiles ADD COLUMN role_id UUID REFERENCES roles(id);

-- Create index
CREATE INDEX idx_profiles_role ON profiles(role_id);
```

#### Step 3: Migrate Existing Data

```sql
-- Migrate existing role data
UPDATE profiles
SET role_id = (SELECT id FROM roles WHERE name = profiles.role);

-- Verify migration (should return 0 if successful)
SELECT COUNT(*) FROM profiles WHERE role_id IS NULL;
```

#### Step 4: Make role_id Required

```sql
-- Make role_id NOT NULL
ALTER TABLE profiles ALTER COLUMN role_id SET NOT NULL;

-- Set default value
ALTER TABLE profiles 
ALTER COLUMN role_id 
SET DEFAULT (SELECT id FROM roles WHERE name = 'user');
```

#### Step 5: Drop Old Column

```sql
-- Drop the old role column
ALTER TABLE profiles DROP COLUMN role;
```

#### Step 6: Update RLS Policies

```sql
-- Drop old policies that reference profiles.role
DROP POLICY IF EXISTS "Only admins can insert localities" ON localities;
DROP POLICY IF EXISTS "Approved stories are viewable by everyone" ON stories;
DROP POLICY IF EXISTS "Moderators can update story status" ON stories;
DROP POLICY IF EXISTS "Media files viewable with their stories" ON media_files;

-- Recreate policies with role join
CREATE POLICY "Only admins can insert localities" 
  ON localities FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Approved stories are viewable by everyone" 
  ON stories FOR SELECT 
  USING (status = 'approved' OR author_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name IN ('moderator', 'admin')
    )
  );

CREATE POLICY "Moderators can update story status" 
  ON stories FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name IN ('moderator', 'admin')
    )
  );

CREATE POLICY "Media files viewable with their stories" 
  ON media_files FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM stories 
      WHERE stories.id = media_files.story_id 
      AND (stories.status = 'approved' OR stories.author_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles p
          JOIN roles r ON p.role_id = r.id
          WHERE p.id = auth.uid() AND r.name IN ('moderator', 'admin')
        )
      )
    )
  );
```

## Rollback Plan

If you need to rollback:

```sql
-- Add back the old role column
ALTER TABLE profiles ADD COLUMN role TEXT;

-- Copy data back
UPDATE profiles
SET role = (SELECT name FROM roles WHERE id = profiles.role_id);

-- Make it required with check constraint
ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('user', 'moderator', 'admin'));

-- Drop the role_id column
ALTER TABLE profiles DROP COLUMN role_id;

-- Drop roles table
DROP TABLE roles CASCADE;

-- Restore original policies (use original SQL from old setup)
```

## Testing After Migration

```sql
-- 1. Verify all users have roles
SELECT COUNT(*) FROM profiles WHERE role_id IS NULL;
-- Should return 0

-- 2. Check role distribution
SELECT r.name, COUNT(p.id) as count
FROM roles r
LEFT JOIN profiles p ON p.role_id = r.id
GROUP BY r.name;

-- 3. Test role queries
SELECT p.email, r.name as role
FROM profiles p
JOIN roles r ON p.role_id = r.id
LIMIT 10;

-- 4. Verify RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

## Application Code Changes

The Angular application has been updated to:

1. **User Model** - Now includes `role_id` and optional `role_name`
2. **Auth Service** - Fetches role information via JOIN
3. **Role Service** - New service for role management

No changes required to existing component code - the `isModerator()` method continues to work transparently.

## Benefits of New Schema

✅ **Better Normalization** - Role information stored once
✅ **Easier Role Management** - Add/modify roles without schema changes
✅ **Future Flexibility** - Can add role permissions, hierarchies, etc.
✅ **Data Integrity** - Foreign key constraints ensure valid roles
✅ **Query Optimization** - Indexed joins for better performance

## Notes

- Migration is backwards compatible with application code
- No downtime required if done during low-traffic period
- Test thoroughly in development before production migration
- Keep backup until migration is verified successful
