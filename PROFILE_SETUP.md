# Profile Update Feature Setup Guide

## Overview
This feature allows users to:
- Update their email address
- Update their full name
- Upload and update their profile image

## Database Setup

### 1. Add profile_image_url column
Run the SQL migration in Supabase SQL Editor:
```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
```

### 2. Create Storage Bucket
1. Go to Supabase Dashboard → Storage
2. Click "New Bucket"
3. Name: `profile-images`
4. Make it **Public** (so profile images can be viewed by everyone)
5. Click "Create Bucket"

### 3. Set Up Storage Policies
In the Storage bucket settings for `profile-images`, create these policies:

#### Policy 1: Upload Own Profile Image
- **Name:** Users can upload their own profile image
- **Allowed operations:** INSERT
- **Target roles:** authenticated
- **Policy definition:**
```sql
(bucket_id = 'profile-images')
```

#### Policy 2: View Profile Images
- **Name:** Public profile images are viewable by everyone
- **Allowed operations:** SELECT
- **Target roles:** public
- **Policy definition:**
```sql
bucket_id = 'profile-images'
```

#### Policy 3: Update Own Profile Image
- **Name:** Users can update their own profile image
- **Allowed operations:** UPDATE
- **Target roles:** authenticated
- **Policy definition:**
```sql
(bucket_id = 'profile-images')
```

#### Policy 4: Delete Own Profile Image
- **Name:** Users can delete their own profile image
- **Allowed operations:** DELETE
- **Target roles:** authenticated
- **Policy definition:**
```sql
(bucket_id = 'profile-images')
```

### 4. Update Profiles Table RLS Policy
Add a policy to allow users to update their own profile:
```sql
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

## Features

### Profile Component (`/profile`)
- **Route:** `/profile`
- **Access:** Authenticated users only
- **Features:**
  - View current profile image (or placeholder if none)
  - Upload new profile image (JPG, PNG, GIF - max 5MB)
  - Update email address (requires email verification)
  - Update full name
  - Cancel button to return to feed
  - Auto-redirect to feed after successful update

### Navigation
A new profile button (👤) has been added to the header navigation for authenticated users.

### Services Updated
- `AuthService`:
  - Added `updateProfile()` method
  - Added `reloadUser()` method
  - Updated `loadUser()` to include `profile_image_url`
  
### Models Updated
- `User` interface now includes optional `profile_image_url?: string`

## Usage

1. **Access Profile Page:**
   - Click the profile icon (👤) in the header
   - Or navigate to `/profile`

2. **Update Profile Image:**
   - Click "📷 Choose Image" button
   - Select an image file (max 5MB)
   - Preview appears immediately
   - Click "❌ Remove" to cancel image selection

3. **Update Email/Name:**
   - Edit the fields as needed
   - Email changes require verification

4. **Save Changes:**
   - Click "💾 Save Changes"
   - Success message appears
   - Auto-redirects to feed after 2 seconds

## File Structure
```
src/app/
├── components/
│   └── profile/
│       ├── profile.component.ts
│       ├── profile.component.html
│       └── profile.component.scss
├── models/
│   └── user.model.ts (updated)
├── services/
│   └── auth.service.ts (updated)
└── app.routes.ts (updated)
```

## Styling
The profile page uses the mustard yellow, black, and white theme with:
- Textbook-style background
- Rounded profile image preview
- Modern form controls
- Responsive design for mobile devices

## Security
- Only authenticated users can access the profile page
- Users can only update their own profile
- Image uploads are validated (type and size)
- Storage policies restrict access appropriately
- Email changes require verification
