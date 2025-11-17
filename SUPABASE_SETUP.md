# Supabase Database Setup Guide

## SQL Schema - Copy and Run in Supabase SQL Editor

### Step 1: Create Tables

```sql
-- Roles table
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

-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role_id UUID REFERENCES roles(id) NOT NULL DEFAULT (SELECT id FROM roles WHERE name = 'user'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Localities table
CREATE TABLE localities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT,
  country TEXT DEFAULT 'India',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stories table
CREATE TABLE stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  locality_id UUID REFERENCES localities(id) NOT NULL,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderator_id UUID REFERENCES profiles(id),
  moderator_notes TEXT,
  moderated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media files table
CREATE TABLE media_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'audio')),
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_profiles_role ON profiles(role_id);
CREATE INDEX idx_stories_locality ON stories(locality_id);
CREATE INDEX idx_stories_author ON stories(author_id);
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_media_story ON media_files(story_id);
```

### Step 2: Enable Row Level Security

```sql
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE localities ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
```

### Step 3: Create RLS Policies

```sql
-- Roles policies
CREATE POLICY "Roles are viewable by everyone" 
  ON roles FOR SELECT 
  USING (true);

CREATE POLICY "Only admins can manage roles" 
  ON roles FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name = 'admin'
    )
  );

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" 
  ON profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Localities policies
CREATE POLICY "Localities are viewable by everyone" 
  ON localities FOR SELECT 
  USING (true);

CREATE POLICY "Only admins can insert localities" 
  ON localities FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name = 'admin'
    )
  );

-- Stories policies
CREATE POLICY "Approved stories are viewable by everyone" 
  ON stories FOR SELECT 
  USING (status = 'approved' OR author_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name IN ('moderator', 'admin')
    )
  );

CREATE POLICY "Authenticated users can create stories" 
  ON stories FOR INSERT 
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Moderators can update story status" 
  ON stories FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name IN ('moderator', 'admin')
    )
  );

-- Media files policies
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

CREATE POLICY "Story authors can insert media" 
  ON media_files FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stories 
      WHERE stories.id = media_files.story_id 
      AND stories.author_id = auth.uid()
    )
  );
```

### Step 4: Insert Sample Data

```sql
INSERT INTO localities (name, state, country) VALUES
  ('Kolkata', 'West Bengal', 'India'),
  ('Mumbai', 'Maharashtra', 'India'),
  ('Delhi', 'Delhi', 'India'),
  ('Bangalore', 'Karnataka', 'India'),
  ('Chennai', 'Tamil Nadu', 'India'),
  ('Hyderabad', 'Telangana', 'India'),
  ('Pune', 'Maharashtra', 'India'),
  ('Ahmedabad', 'Gujarat', 'India');
```

### Step 5: Storage Setup

1. Go to **Storage** in Supabase Dashboard
2. Create a new bucket named `media`
3. Make it **public**
4. Add the following policies in SQL Editor:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media' 
  AND auth.role() = 'authenticated'
);

-- Allow public read access
CREATE POLICY "Public can view media"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- Allow users to delete their own files
CREATE POLICY "Users can delete own media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## Making a User a Moderator

After a user signs up, run this query to make them a moderator:

```sql
-- Make user a moderator
UPDATE profiles 
SET role_id = (SELECT id FROM roles WHERE name = 'moderator')
WHERE email = 'abhishek.abhishek2011@gmail.com';

-- Or make user an admin
UPDATE profiles 
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE email = 'admin@example.com';
```

## Useful Role Management Queries

```sql
-- Get all users with their roles
SELECT p.id, p.email, p.full_name, r.name as role
FROM profiles p
JOIN roles r ON p.role_id = r.id;

-- Get all moderators
SELECT p.email, p.full_name
FROM profiles p
JOIN roles r ON p.role_id = r.id
WHERE r.name = 'moderator';

-- Count users by role
SELECT r.name, COUNT(p.id) as user_count
FROM roles r
LEFT JOIN profiles p ON p.role_id = r.id
GROUP BY r.name;
```

## Verification Queries

Check if everything is set up correctly:

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check localities
SELECT * FROM localities;

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```
