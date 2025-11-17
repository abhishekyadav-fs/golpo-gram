# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Setup Supabase (2 minutes)
1. Go to https://supabase.com
2. Sign up (free, no credit card)
3. Create new project "golpo-gram"
4. Copy your **Project URL** and **anon key** from Settings → API

### 2. Configure App (30 seconds)
Edit `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  supabase: {
    url: 'YOUR_PROJECT_URL',
    anonKey: 'YOUR_ANON_KEY'
  }
};
```

### 3. Setup Database (2 minutes)
1. Open Supabase SQL Editor
2. Copy & paste SQL from `SUPABASE_SETUP.md`
3. Run each section (Tables → RLS → Policies → Sample Data)
4. Create storage bucket named `media` (make it public)

### 4. Run App (30 seconds)
```bash
npm install
ng serve
```
Open http://localhost:4200

## 📝 First Steps

1. **Sign Up** - Create your account
2. **Browse Feed** - See stories (will be empty initially)
3. **Create Story** - Write your first story
4. **Make Yourself Moderator** - Run SQL:
   ```sql
   UPDATE profiles 
   SET role_id = (SELECT id FROM roles WHERE name = 'moderator')
   WHERE email = 'your@email.com';
   ```
5. **Moderate** - Approve your story to see it in feed

## 🎯 Key Features

- ✅ User signup/login
- ✅ Create stories with media (images/audio/video)
- ✅ Filter by locality
- ✅ Moderator review system
- ✅ Mobile responsive
- ✅ Track your stories

## 🆓 Cost: $0

Free tier includes:
- 500MB database
- 1GB storage
- 50k monthly users
- No credit card needed

## 📚 Full Documentation

See `README.md` for complete setup instructions and deployment options.
