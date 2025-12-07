# ClosePro - Real Estate CRM Lite

A focused, no-bloat CRM designed for real estate agents who want to close more deals without wrestling with software.

## Features

- **Hot Lead Management** - Instantly see your hottest prospects at a glance
- **Deal Pipeline** - Drag-and-drop kanban board for tracking deals
- **Temperature Tracking** - Categorize leads as Hot, Warm, or Cold
- **Follow-up Reminders** - Never miss a follow-up with priority-based reminders
- **Property Showings** - Log showings with client reactions
- **Quick Templates** - Copy-paste messages personalized for each client
- **Important Dates** - Birthday and home anniversary tracking
- **Lead Source Analytics** - Know where your best leads come from
- **Email Sync** - Connect Gmail/Outlook to automatically log emails as activities
- **Stripe Payments** - Subscription billing with multiple plan tiers
- **CSV Import/Export** - Bulk import contacts or export for backup
- **Calendar Integration** - Sync with Google Calendar and Outlook, schedule events

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (free tier works great)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Demo Mode

The app runs in **demo mode** by default (without Supabase). In demo mode:
- Data is stored in localStorage
- No account required
- Great for testing

### Production Mode (with Supabase)

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Run the database schema**:
   - Go to your Supabase dashboard → SQL Editor
   - Copy the contents of `supabase/schema.sql`
   - Run the SQL to create tables and policies

3. **Configure environment variables**:
   Create a `.env` file in the project root:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
   
   Find these values in: Supabase Dashboard → Settings → API

4. **Enable Email Auth** (optional):
   - Supabase Dashboard → Authentication → Providers
   - Configure email templates for confirmation/reset

5. **Restart the dev server**:
   ```bash
   npm run dev
   ```

### Email Sync Setup (Optional)

To enable Gmail/Outlook email sync:

1. **Set up OAuth credentials** (see `EMAIL_SYNC_SETUP.md` for detailed instructions)
2. **Add to `.env`**:
   ```
   VITE_GMAIL_CLIENT_ID=your-gmail-client-id
   VITE_GMAIL_CLIENT_SECRET=your-gmail-secret
   VITE_OUTLOOK_CLIENT_ID=your-outlook-client-id
   VITE_OUTLOOK_CLIENT_SECRET=your-outlook-secret
   ```
3. **Connect accounts** in the app: Navigate to "Email Sync" in the sidebar

**Note**: For production, consider using a backend proxy for OAuth (more secure). See `EMAIL_SYNC_SETUP.md` for details.

### Stripe Payments Setup (Optional)

To enable subscription payments:

1. **Create Stripe account** at [stripe.com](https://stripe.com)
2. **Create products and prices** in Stripe Dashboard
3. **Set up backend API** (see `STRIPE_SETUP.md` for detailed instructions)
4. **Add to `.env`**:
   ```
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   VITE_STRIPE_STARTER_PRICE_ID=price_...
   VITE_STRIPE_PRO_PRICE_ID=price_...
   VITE_STRIPE_TEAM_PRICE_ID=price_...
   ```
5. **Configure webhooks** for subscription updates

**Note**: Stripe integration requires backend endpoints for security. See `STRIPE_SETUP.md` for complete setup guide including Supabase Edge Functions or Node.js backend options.

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Supabase** - Database, Auth, and Row-Level Security
- **Lucide React** - Beautiful icons
- **date-fns** - Date utilities

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.jsx       # Main app layout with sidebar
│   ├── AddContactModal.jsx
│   ├── EditContactModal.jsx
│   └── AddReminderModal.jsx
├── pages/               # Page components
│   ├── Dashboard.jsx    # Home dashboard
│   ├── Contacts.jsx     # Contact list view
│   ├── ContactDetail.jsx # Single contact view
│   ├── Pipeline.jsx     # Deal pipeline kanban
│   ├── Reminders.jsx    # Reminder management
│   ├── Templates.jsx    # Quick message templates
│   ├── Login.jsx        # Authentication
│   └── Signup.jsx
├── store/               # State management
│   ├── AuthContext.jsx  # Authentication state
│   └── CRMContext.jsx   # CRM data and operations
├── lib/
│   └── supabase.js      # Supabase client config
├── App.jsx              # Root component with routing
├── App.css              # App-specific styles
└── index.css            # Global styles and design tokens

supabase/
└── schema.sql           # Database schema with RLS policies
```

## Database Schema

The app uses 5 main tables:
- `contacts` - Client/lead information
- `activities` - Interaction history (calls, emails, meetings)
- `showings` - Property showing log
- `reminders` - Follow-up reminders
- `templates` - Quick message templates

All tables use Row-Level Security (RLS) to ensure users only see their own data.

## Deployment

### Vercel (Recommended)

```bash
npm run build
```

Then deploy to Vercel:
1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Roadmap

- [ ] Gmail/Outlook email sync
- [ ] Mobile app (React Native)
- [ ] Team collaboration features
- [ ] Stripe payments integration
- [ ] CSV import/export
- [ ] Calendar integration

## License

MIT
