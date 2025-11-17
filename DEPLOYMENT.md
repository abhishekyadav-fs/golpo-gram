# Deployment Checklist

## Pre-Deployment Checklist

### 1. Supabase Setup ✓
- [ ] Create Supabase account
- [ ] Create new project
- [ ] Copy Project URL
- [ ] Copy Anon Key
- [ ] Run database schema SQL
- [ ] Enable RLS
- [ ] Create RLS policies
- [ ] Create storage bucket `media`
- [ ] Set bucket to public
- [ ] Add storage policies
- [ ] Insert sample localities
- [ ] Create test user account
- [ ] Promote test user to moderator

### 2. Application Configuration ✓
- [ ] Update `environment.ts` with Supabase credentials
- [ ] Update `environment.prod.ts` with Supabase credentials
- [ ] Test login/signup
- [ ] Test story creation
- [ ] Test media upload
- [ ] Test moderation flow
- [ ] Test feed filtering

### 3. Build & Test ✓
- [ ] Run `npm install`
- [ ] Run `ng serve` - Test locally
- [ ] Run `ng build --configuration production`
- [ ] Check for build errors
- [ ] Check bundle size
- [ ] Test production build locally

### 4. Code Quality ✓
- [ ] Remove console.logs
- [ ] Fix linting errors
- [ ] Remove unused imports
- [ ] Update README with actual URLs
- [ ] Add screenshots to README

## Deployment Options

### Option 1: Netlify (Recommended)

**Steps:**
1. Push code to GitHub
2. Go to https://netlify.com
3. Click "Add new site" → "Import from Git"
4. Connect to your GitHub repo
5. Configure build settings:
   - Build command: `ng build --configuration production`
   - Publish directory: `dist/golpo-gram-app`
6. Click "Deploy site"
7. Get your URL: `https://your-site.netlify.app`

**Environment Variables:**
- Netlify handles this automatically from your code

**Custom Domain (Optional):**
1. Buy domain (Namecheap, GoDaddy, etc.)
2. In Netlify: Domain settings → Add custom domain
3. Update DNS records as instructed

---

### Option 2: Vercel

**Steps:**
1. Push code to GitHub
2. Go to https://vercel.com
3. Import project
4. Framework preset: Angular
5. Deploy
6. Get URL: `https://your-site.vercel.app`

---

### Option 3: Firebase Hosting

**Steps:**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize
firebase init hosting
# Choose: dist/golpo-gram-app as public directory
# Configure as single-page app: Yes
# Setup automatic builds: No

# Deploy
firebase deploy
```

---

## Post-Deployment Checklist

### Functional Testing
- [ ] Visit deployed URL
- [ ] Test signup flow
- [ ] Test login flow
- [ ] Create a story
- [ ] Upload media (image, video, audio)
- [ ] Check feed display
- [ ] Filter by different localities
- [ ] Test moderation (approve/reject)
- [ ] Check "My Stories" page
- [ ] Test logout

### Mobile Testing
- [ ] Open on iPhone Safari
- [ ] Open on Android Chrome
- [ ] Test all features on mobile
- [ ] Check responsive layouts
- [ ] Test touch interactions

### Cross-Browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Performance Testing
- [ ] Run Lighthouse audit
- [ ] Check page load time
- [ ] Verify image optimization
- [ ] Test on slow 3G

### Security Testing
- [ ] Verify RLS working (can't access other users' pending stories)
- [ ] Test unauthorized access attempts
- [ ] Verify file upload restrictions
- [ ] Check HTTPS is enforced

## Monitoring Setup

### Supabase Dashboard
- [ ] Check database usage
- [ ] Monitor storage usage
- [ ] Review API logs
- [ ] Set up usage alerts

### Analytics (Optional)
- [ ] Add Google Analytics
- [ ] Add Hotjar for user behavior
- [ ] Setup error tracking (Sentry)

## Marketing Checklist

### Pre-Launch
- [ ] Create landing page
- [ ] Write launch blog post
- [ ] Prepare social media posts
- [ ] Create demo video/screenshots
- [ ] List on Product Hunt
- [ ] Submit to Indie Hackers

### Launch Day
- [ ] Post on social media
- [ ] Email friends/network
- [ ] Post in relevant communities
- [ ] Respond to feedback

## Maintenance Schedule

### Daily
- [ ] Check error logs
- [ ] Monitor user signups
- [ ] Review pending stories (as moderator)

### Weekly
- [ ] Review analytics
- [ ] Check Supabase usage
- [ ] Backup database
- [ ] Update dependencies

### Monthly
- [ ] Security updates
- [ ] Performance optimization
- [ ] Feature planning
- [ ] User feedback review

## Emergency Contacts

**Supabase Issues:**
- Dashboard: https://app.supabase.com
- Support: https://supabase.com/support
- Status: https://status.supabase.com

**Hosting Issues:**
- Netlify: https://answers.netlify.com
- Vercel: https://vercel.com/support

## Rollback Plan

If deployment fails:
1. Revert to previous Git commit
2. Redeploy
3. Check Supabase for any breaking changes
4. Review error logs
5. Fix issues in dev environment
6. Test thoroughly
7. Redeploy

## Success Criteria

✅ Application loads without errors
✅ All features working as expected
✅ Mobile responsive
✅ HTTPS enabled
✅ Performance score > 80
✅ No console errors
✅ Database connected
✅ File uploads working
✅ Authentication working

---

## Quick Deploy Commands

**Netlify:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build
ng build --configuration production

# Deploy
netlify deploy --prod --dir=dist/golpo-gram-app
```

**Vercel:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

---

**Ready to launch! 🚀**
