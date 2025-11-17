# Golpogram - Story/News Sharing Platform# GolpoGramApp



A modern web application for sharing locality-based stories with moderation features.This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.8.



## 🚀 Features## Development server



✅ **User Authentication** - Signup/Login with email and passwordTo start a local development server, run:

✅ **Story Publishing** - Create stories with text, images, audio, and video

✅ **Locality-Based Filtering** - View stories filtered by specific localities```bash

✅ **Moderator Review System** - Stories must be approved before going liveng serve

✅ **Media Upload Support** - Upload and display images, audio, and video files```

✅ **Mobile Responsive** - Fully optimized for mobile devices

✅ **User Dashboard** - Track your submitted stories and their statusOnce the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.



## 🛠️ Tech Stack## Code scaffolding



### FrontendAngular CLI includes powerful code scaffolding tools. To generate a new component, run:

- **Angular 19** - Modern web framework

- **TypeScript** - Type-safe development```bash

- **SCSS** - Styled componentsng generate component component-name

- **Reactive Forms** - Form validation and handling```



### Backend (Recommended: **Supabase**)For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

- **PostgreSQL** - Robust relational database

- **Row Level Security** - Secure data access```bash

- **Storage** - Media file hostingng generate --help

- **Authentication** - Built-in auth system```

- **Real-time** - Live updates support

## Building

### Why Supabase?

- ✅ **100% Free for Beta** - Generous free tierTo build the project run:

- ✅ **Open Source** - Self-hostable

- ✅ **500MB Database** - Sufficient for beta```bash

- ✅ **1GB File Storage** - For media filesng build

- ✅ **50,000 MAU** - Monthly active users```

- ✅ **No Credit Card Required** - Get started immediately

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## 📋 Prerequisites

## Running unit tests

- Node.js (v18 or higher)

- npm (v9 or higher)To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

- Angular CLI (v19 or higher)

```bash

## 🔧 Installation & Setupng test

```

### 1. Install Dependencies

## Running end-to-end tests

```bash

cd golpo-gram-appFor end-to-end (e2e) testing, run:

npm install

``````bash

ng e2e

### 2. Set Up Supabase Backend```



#### Create a Supabase ProjectAngular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.



1. Go to [https://supabase.com](https://supabase.com)## Additional Resources

2. Click "Start your project"

3. Sign up with GitHub (free)For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

4. Create a new project:
   - Project name: `golpo-gram`
   - Database password: (choose a strong password)
   - Region: (select closest to your location)
   - Wait for project setup (2-3 minutes)

#### Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

#### Update Environment Files

Edit `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  supabase: {
    url: 'YOUR_SUPABASE_URL_HERE',
    anonKey: 'YOUR_SUPABASE_ANON_KEY_HERE'
  }
};
```

Edit `src/environments/environment.prod.ts` with the same values.

### 3. Create Database Schema

In Supabase Dashboard, go to **SQL Editor** and run these queries:

#### Create Tables

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

-- Create indexes for better query performance
CREATE INDEX idx_profiles_role ON profiles(role_id);
CREATE INDEX idx_stories_locality ON stories(locality_id);
CREATE INDEX idx_stories_author ON stories(author_id);
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_media_story ON media_files(story_id);
```

#### Set Up Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE localities ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

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
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Stories policies
CREATE POLICY "Approved stories are viewable by everyone" 
  ON stories FOR SELECT 
  USING (status = 'approved' OR author_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

CREATE POLICY "Authenticated users can create stories" 
  ON stories FOR INSERT 
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Moderators can update story status" 
  ON stories FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
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
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role IN ('moderator', 'admin')
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

#### Create Storage Bucket for Media Files

1. In Supabase Dashboard, go to **Storage**
2. Click **New bucket**
3. Name: `media`
4. Set to **Public bucket** (check the box)
5. Click **Create bucket**

#### Set Storage Policies

Go to **Storage** → `media` bucket → **Policies** and add:

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

#### Insert Sample Localities

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

#### Create a Moderator Account (Optional)

```sql
-- After signing up through the app, update a user to moderator:
UPDATE profiles 
SET role_id = (SELECT id FROM roles WHERE name = 'moderator')
WHERE email = 'your-email@example.com';
```

## 🏃 Running the Application

### Development Server

```bash
cd golpo-gram-app
ng serve
```

Navigate to `http://localhost:4200/`

### Build for Production

```bash
ng build --configuration production
```

The build artifacts will be stored in the `dist/` directory.

## 📱 Application Flow

1. **Sign Up** - New users create an account
2. **Create Story** - Users write stories, select locality, and upload media
3. **Moderation** - Moderators review and approve/reject stories
4. **Feed** - Approved stories appear in the locality-filtered feed
5. **My Stories** - Users track their story statuses

## 🔐 User Roles

- **User** - Can create and view stories
- **Moderator** - Can review and approve/reject stories
- **Admin** - Full access including adding localities

## 📂 Project Structure

```
golpo-gram-app/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   ├── feed/
│   │   │   ├── create-story/
│   │   │   ├── moderation/
│   │   │   └── my-stories/
│   │   ├── models/
│   │   │   ├── user.model.ts
│   │   │   └── story.model.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── story.service.ts
│   │   │   └── locality.service.ts
│   │   └── app.routes.ts
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   └── styles.scss
└── README.md
```

## 🌐 Deployment Options (Free)

### Netlify
1. Push code to GitHub
2. Connect Netlify to your repo
3. Build command: `ng build --configuration production`
4. Publish directory: `dist/golpo-gram-app`

### Vercel
1. Push code to GitHub
2. Import project in Vercel
3. Framework preset: Angular
4. Deploy

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 🔄 Alternative Backend Options

### Firebase (Alternative to Supabase)
- Free tier: 1GB storage, 10GB bandwidth
- Similar features to Supabase
- Google ecosystem integration

### Appwrite (Self-hosted)
- 100% open source
- Self-hostable
- Similar to Supabase/Firebase

## 📊 Cost Breakdown (Free Tier)

**Supabase Free Tier:**
- Database: 500MB (sufficient for ~10,000 stories)
- Storage: 1GB (sufficient for ~500 images)
- Users: 50,000 MAU
- Bandwidth: 2GB/month
- No credit card required

**Scaling:**
- When you outgrow free tier, Pro plan is $25/month
- Can self-host Supabase for free

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

## 📄 License

This project is open source and available under the MIT License.

## 📧 Support

For issues or questions, please create an issue in the repository.

---

**Built with ❤️ using Angular and Supabase**
