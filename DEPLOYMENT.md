# Quick Deployment Guide

## Deploy to Vercel (5 minutes)

### Step 1: Prepare Your Code
```bash
# Make sure everything is committed
git add .
git commit -m "Ready for production"
git push origin main
```

### Step 2: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "New Project"
4. Import your GitHub repository

### Step 3: Configure Environment Variables
In Vercel project settings → Environment Variables, add:

```
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = your-anon-key
```

### Step 4: Deploy
- Click "Deploy"
- Wait 2-3 minutes
- Your app is live! 🎉

### Step 5: Add Custom Domain (Optional)
1. Vercel Dashboard → Settings → Domains
2. Add your domain (e.g., `closepro.app`)
3. Update DNS records as instructed
4. SSL is automatic

---

## Deploy to Netlify (Alternative)

### Step 1: Build Settings
- **Build command:** `npm run build`
- **Publish directory:** `dist`

### Step 2: Environment Variables
Add in Netlify Dashboard → Site Settings → Environment Variables

### Step 3: Deploy
- Connect GitHub repo
- Deploy automatically on push

---

## Production Supabase Setup

### 1. Create Production Project
- Go to [supabase.com](https://supabase.com)
- Create a NEW project (separate from dev)
- Name it "ClosePro Production"

### 2. Run Schema
- Copy `supabase/schema.sql`
- Supabase Dashboard → SQL Editor
- Paste and run

### 3. Get Production Keys
- Settings → API
- Copy URL and anon key
- Use these in Vercel environment variables

### 4. Configure Auth
- Authentication → URL Configuration
- Add your production domain to "Redirect URLs"
- Example: `https://closepro.app`

---

## Post-Deployment Checklist

- [ ] Test signup on production domain
- [ ] Test login/logout
- [ ] Create a contact
- [ ] Verify data persists
- [ ] Check mobile responsiveness
- [ ] Test in different browsers
- [ ] Verify SSL certificate (https://)
- [ ] Check error tracking (if configured)

---

## Rollback Plan

If something breaks:

**Vercel:**
- Dashboard → Deployments
- Find last working deployment
- Click "..." → "Promote to Production"

**Netlify:**
- Deploys → Find working version → "Publish deploy"

---

## Monitoring

### Check These Daily (First Week)
1. **Vercel Analytics** - Page views, errors
2. **Supabase Dashboard** - Database usage, errors
3. **Sentry** (if configured) - JavaScript errors
4. **User signups** - Track in Supabase Auth dashboard

---

## Common Issues

### "Supabase not configured" warning
- Check environment variables are set correctly
- Restart Vercel deployment after adding env vars

### Users can't sign up
- Check Supabase Auth is enabled
- Verify email templates are configured
- Check spam folder for confirmation emails

### Data not persisting
- Verify RLS policies are active
- Check Supabase logs for errors
- Verify user_id is being set correctly

---

## Next Steps After Deployment

1. **Create landing page** - Simple marketing site
2. **Set up analytics** - Track signups
3. **Configure error tracking** - Catch bugs early
4. **Share with beta testers** - Get feedback
5. **Monitor and iterate** - Fix issues quickly

---

**You're ready! 🚀**

