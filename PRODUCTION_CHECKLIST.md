# ClosePro Production Launch Checklist

## Pre-Launch Testing ✅

### Functionality
- [ ] Test signup flow end-to-end
- [ ] Test login/logout
- [ ] Create, edit, delete contacts
- [ ] Add activities and showings
- [ ] Create and complete reminders
- [ ] Test deal pipeline drag-and-drop
- [ ] Test templates (create, edit, copy)
- [ ] Test on mobile devices (responsive)
- [ ] Test in different browsers (Chrome, Firefox, Safari, Edge)

### Data Integrity
- [ ] Verify RLS policies work (users can't see each other's data)
- [ ] Test data persistence across sessions
- [ ] Verify timestamps update correctly
- [ ] Test with multiple user accounts

### Security
- [ ] Verify `.env` is in `.gitignore`
- [ ] Check that anon key is safe to expose (RLS protects data)
- [ ] Test password reset flow (if implemented)
- [ ] Verify email confirmation works

---

## Deployment Setup

### Option 1: Vercel (Recommended - Easiest)

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Deploy to Vercel:**
   - Push code to GitHub
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repo
   - Add environment variables:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
   - Deploy!

**Cost:** Free tier is generous, then $20/mo for Pro

### Option 2: Netlify

1. **Build:**
   ```bash
   npm run build
   ```

2. **Deploy:**
   - Push to GitHub
   - Connect to Netlify
   - Add env vars in Netlify dashboard
   - Deploy

**Cost:** Free tier available

### Option 3: Railway / Render

- Both support Node.js apps
- Slightly more setup but more control
- Good for backend-heavy apps (you don't need this yet)

---

## Domain & SSL

### Get a Domain
- **Namecheap** or **Cloudflare** (~$10-15/year)
- Suggested: `closepro.app` or `closepro.io`

### Connect Domain to Vercel
1. Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain
3. Update DNS records (Vercel provides instructions)
4. SSL is automatic (Let's Encrypt)

---

## Supabase Production Setup

### 1. Database
- [ ] Run `schema.sql` in production Supabase project
- [ ] Verify all tables created
- [ ] Test RLS policies

### 2. Authentication
- [ ] Configure email templates (Supabase Dashboard → Auth → Email Templates)
- [ ] Set up custom SMTP (optional, for better deliverability)
- [ ] Configure redirect URLs:
  - `https://yourdomain.com`
  - `https://yourdomain.com/auth/callback`

### 3. Environment Variables
- [ ] Use production Supabase project URL and keys
- [ ] Never use development keys in production

### 4. Database Backups
- Supabase free tier: Daily backups
- Pro tier: Point-in-time recovery
- Consider upgrading if you get paying customers

---

## Email Configuration

### Supabase Email Templates
Customize in: Supabase Dashboard → Authentication → Email Templates

**Confirmation Email:**
```
Welcome to ClosePro!

Click the link below to confirm your email:
{{ .ConfirmationURL }}

If you didn't sign up, you can ignore this email.
```

**Password Reset:**
```
Reset your ClosePro password

Click here to reset: {{ .ConfirmationURL }}

This link expires in 1 hour.
```

### Custom SMTP (Optional but Recommended)
For better deliverability, use:
- **SendGrid** (free tier: 100 emails/day)
- **Resend** (free tier: 3,000 emails/month)
- **Postmark** (paid, but excellent deliverability)

Configure in: Supabase Dashboard → Project Settings → Auth → SMTP Settings

---

## Monitoring & Analytics

### Error Tracking
**Sentry** (free tier available):
```bash
npm install @sentry/react
```

Add to `src/main.jsx`:
```jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: "production",
});
```

### Analytics
**Plausible** (privacy-friendly, $9/mo):
- Add script to `index.html`
- No cookies, GDPR compliant

**Or PostHog** (free tier, open source):
- Better for product analytics
- Session recordings

### Uptime Monitoring
- **UptimeRobot** (free tier: 50 monitors)
- **Better Uptime** (free, open source)

---

## Performance Optimization

### Before Launch
- [ ] Run `npm run build` and check bundle size
- [ ] Enable Vercel's edge caching
- [ ] Optimize images (if you add any)
- [ ] Test Lighthouse score (aim for 90+)

### Supabase Optimization
- [ ] Add indexes for frequently queried fields (already in schema)
- [ ] Monitor query performance in Supabase Dashboard
- [ ] Consider connection pooling for high traffic

---

## Legal & Compliance

### Required Pages
- [ ] **Privacy Policy** - Use a generator like [Termly](https://termly.io)
- [ ] **Terms of Service** - Use a generator
- [ ] **Cookie Policy** (if using analytics)

### GDPR (if serving EU users)
- [ ] Privacy policy link in footer
- [ ] Cookie consent banner (if using cookies)
- [ ] Data export functionality (users can download their data)
- [ ] Data deletion (users can delete account)

### Payment Processing (When Ready)
- [ ] Stripe account setup
- [ ] Terms of Service updated for payments
- [ ] Refund policy

---

## Launch Day Checklist

### Pre-Launch (1 day before)
- [ ] All tests passing
- [ ] Production domain working
- [ ] SSL certificate active
- [ ] Email templates customized
- [ ] Error tracking configured
- [ ] Analytics configured

### Launch Day
- [ ] Deploy to production
- [ ] Test signup flow on production
- [ ] Create your own account
- [ ] Import sample data
- [ ] Share with 5-10 beta testers
- [ ] Monitor error logs

### Post-Launch (First Week)
- [ ] Monitor Sentry for errors
- [ ] Check Supabase dashboard for unusual activity
- [ ] Respond to user feedback
- [ ] Fix critical bugs immediately
- [ ] Document common issues

---

## Marketing & Growth

### Landing Page
Create a simple landing page at your root domain:
- Hero section with value prop
- Feature highlights
- Pricing (even if free initially)
- "Start Free Trial" CTA
- Social proof (testimonials when you have them)

### Distribution Channels
1. **Reddit** - r/realtors, r/RealEstate
   - Be helpful, not spammy
   - Share in "What tools do you use?" threads

2. **Facebook Groups** - Real estate agent groups
   - Share your story: "Built by an agent, for agents"

3. **Product Hunt** - Launch when ready
   - Prepare screenshots, demo video
   - Engage with comments

4. **Cold Outreach** - DM agents on LinkedIn/Instagram
   - Personal, not automated
   - Offer free beta access

5. **Content Marketing**
   - Blog posts: "5 CRM Mistakes Agents Make"
   - YouTube: "How to Never Lose a Lead"
   - SEO-focused content

---

## Pricing Strategy

### Free Tier (to start)
- Unlimited contacts
- All features
- No credit card required
- Builds trust, gets users

### Paid Tiers (after validation)
- **Starter**: $29/mo - 100 contacts
- **Pro**: $49/mo - Unlimited contacts
- **Team**: $99/mo - 3 users

**When to add pricing:**
- After 50+ active users
- When you have feature requests that cost money
- When users ask "How do I pay?"

---

## Post-Launch Roadmap

### Month 1: Stability
- Fix bugs
- Improve UX based on feedback
- Add missing features users request

### Month 2: Growth
- Add Stripe payments
- Implement referral program
- Email marketing to users

### Month 3: Scale
- Team features (if requested)
- API for integrations
- Mobile app (if needed)

---

## Emergency Contacts

- **Supabase Support**: support@supabase.io
- **Vercel Support**: support@vercel.com
- **Domain Registrar**: Your registrar's support

---

## Success Metrics to Track

- **Signups per week**
- **Active users (login in last 7 days)**
- **Contacts created per user**
- **Reminders completed**
- **Churn rate** (users who stop using)
- **Conversion to paid** (when you add pricing)

---

## Quick Start Commands

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview

# Deploy to Vercel (after connecting repo)
vercel --prod

# Check bundle size
npm run build && npx vite-bundle-visualizer
```

---

**You're ready to launch when:**
✅ All tests pass
✅ Production domain works
✅ You can sign up and use the app
✅ Error tracking is configured
✅ You have a landing page

**Good luck! 🚀**

