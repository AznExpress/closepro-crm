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

### Step 3: Configure Environment Variables (CRITICAL)
**This is required for production to work!**

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add the following variables (one at a time):

   **For Production:**
   - Name: `VITE_SUPABASE_URL`
   - Value: `https://your-project-id.supabase.co` (from Supabase Settings → API)
   - Environment: Select **Production** (and optionally Preview/Development)
   
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: Your Supabase anon/public key (from Supabase Settings → API)
   - Environment: Select **Production** (and optionally Preview/Development)

   **For Email Sync (Required if using email features):**
   - Name: `VITE_GMAIL_CLIENT_ID`
   - Value: Your Gmail OAuth Client ID (from Google Cloud Console)
   - Environment: Select **Production** (and optionally Preview/Development)
   
   - Name: `VITE_GMAIL_CLIENT_SECRET`
   - Value: Your Gmail OAuth Client Secret (from Google Cloud Console)
   - Environment: Select **Production** (and optionally Preview/Development)
   
   - Name: `VITE_OUTLOOK_CLIENT_ID`
   - Value: Your Outlook OAuth Client ID (from Azure Portal)
   - Environment: Select **Production** (and optionally Preview/Development)
   
   - Name: `VITE_OUTLOOK_CLIENT_SECRET`
   - Value: Your Outlook OAuth Client Secret (from Azure Portal) - Optional for SPA apps
   - Environment: Select **Production** (and optionally Preview/Development)
   
   **📖 How to get OAuth credentials:** See `EMAIL_SYNC_SETUP.md` for step-by-step instructions.

   **Optional (for Stripe):**
   - `VITE_STRIPE_PUBLISHABLE_KEY`

3. **IMPORTANT:** After adding variables, you MUST:
   - Click "Save" for each variable
   - Go to Deployments tab
   - Click "..." on the latest deployment → "Redeploy"
   - OR push a new commit to trigger a new deployment
   
4. **Verify:** After redeploy:
   - Check the browser console on your production site
   - You should NOT see "Supabase credentials not found" warning
   - If using email sync, visit `/email-settings` - the "Setup Required" message should disappear after adding OAuth credentials

### Step 4: Deploy
- Click "Deploy"
- Wait 2-3 minutes
- Your app is live! 🎉

### Step 5: Add Custom Domain (Optional)
1. Vercel Dashboard → Settings → Domains
2. Add your domain (e.g., `closepro.org`)
3. Update DNS records as instructed by Vercel
4. Wait for DNS propagation (can take up to 48 hours, usually much faster)
5. SSL certificate is automatic (Vercel handles this)
6. **After domain is active:** Make sure environment variables are set for Production environment

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

### 4. Configure OAuth Redirect URIs (IMPORTANT for Email Sync)

If you're using email sync features, you MUST update the redirect URIs in your OAuth providers:

**For Gmail (Google Cloud Console):**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. APIs & Services → Credentials
4. Click on your OAuth 2.0 Client ID
5. Under "Authorized redirect URIs", add:
   - `https://closepro.org/email-settings` (or your production domain)
   - `https://www.closepro.org/email-settings` (if using www subdomain)
6. Click "Save"

**For Outlook (Azure Portal):**
1. Go to [Azure Portal](https://portal.azure.com)
2. Azure Active Directory → App registrations
3. Select your app
4. Authentication → Platform configurations
5. Under "Single-page application" redirect URIs, add:
   - `https://closepro.org/email-settings` (or your production domain)
   - `https://www.closepro.org/email-settings` (if using www subdomain)
6. Click "Save"

**⚠️ Critical:** The redirect URI must match EXACTLY (including protocol, domain, and path). No trailing slashes!

### 5. Configure Auth (IMPORTANT for Custom Domain)
- Authentication → URL Configuration
- **Site URL:** Set to your production domain (e.g., `https://closepro.org` or `https://www.closepro.org`)
- **Redirect URLs:** Add ALL of these (one per line):
  - `https://closepro.org`
  - `https://closepro.org/**`
  - `https://www.closepro.org` (if using www subdomain)
  - `https://www.closepro.org/**` (if using www subdomain)
  - `https://closepro.org/email-settings` (for OAuth callbacks)
  - `https://closepro.org/login` (for auth redirects)
- Click "Save"
- **Note:** This tells Supabase which domains are allowed for authentication and prevents CORS errors

### 6. Verify Environment Variables Format (CRITICAL)
**Common mistake:** The Supabase URL in Vercel might have extra characters or be malformed.

**Correct format:**
```
VITE_SUPABASE_URL=https://kuwcfcvpvjnqycrbndix.supabase.co
```

**Common mistakes:**
- ❌ `https://xxxkuwcfcvpvjnqycrbndix.supabase.co` (extra "xxx" prefix)
- ❌ `http://kuwcfcvpvjnqycrbndix.supabase.co` (missing 's' in https)
- ❌ `kuwcfcvpvjnqycrbndix.supabase.co` (missing https://)
- ❌ `https://kuwcfcvpvjnqycrbndix.supabase.co/` (trailing slash)
- ✅ `https://kuwcfcvpvjnqycrbndix.supabase.co` (correct)

**To fix:**
1. Go to Vercel → Settings → Environment Variables
2. Check the value of `VITE_SUPABASE_URL`
3. It should be exactly: `https://kuwcfcvpvjnqycrbndix.supabase.co` (no extra characters)
4. If wrong, edit it and save
5. Redeploy

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

### "Supabase not configured" or "Network error" on production
**This means environment variables are missing or incorrect:**

1. **Check Vercel Environment Variables:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
   - **CRITICAL:** Make sure they're set for **Production** environment (not just Preview/Development)
   - Check for typos (no spaces, correct variable names)

2. **Redeploy after adding variables:**
   - Environment variables only apply to NEW deployments
   - Go to Deployments → Click "..." → "Redeploy"
   - OR push a new commit to trigger deployment

3. **Verify Supabase URL:**
   - Should be: `https://xxxxx.supabase.co` (not `http://`, not missing `.co`)
   - Get from: Supabase Dashboard → Settings → API → Project URL

4. **Check Supabase Auth Configuration:**
   - Supabase Dashboard → Authentication → URL Configuration
   - Add your production domain to "Site URL" and "Redirect URLs"
   - Example: `https://closepro.org`

5. **Test in browser console:**
   - Open production site → F12 → Console
   - Should NOT see: "⚠️ Supabase credentials not found"
   - If you see it, environment variables aren't being loaded

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

