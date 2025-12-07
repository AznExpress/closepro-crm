# Email Sync Setup Guide

ClosePro can automatically sync emails from Gmail and Outlook, logging them as activities in your CRM.

## How It Works

1. **Connect Account**: User authorizes ClosePro to access their email
2. **Automatic Matching**: Emails are matched to contacts by email address
3. **Activity Logging**: Sent and received emails appear in contact activity timelines

## Setup Instructions

### Gmail OAuth Setup

1. **Go to Google Cloud Console**
   - Visit [console.cloud.google.com](https://console.cloud.google.com)
   - Create a new project or select existing

2. **Enable Gmail API**
   - APIs & Services → Library
   - Search "Gmail API"
   - Click "Enable"

3. **Create OAuth Credentials**
   - APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Name: "ClosePro CRM"
   - Authorized redirect URIs:
     - `http://localhost:5173/email-settings` (development)
     - `https://yourdomain.com/email-settings` (production)

4. **Copy Credentials**
   - Copy the **Client ID** and **Client Secret**
   - Add to your `.env` file:
     ```
     VITE_GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
     VITE_GMAIL_CLIENT_SECRET=your-client-secret
     ```

### Outlook OAuth Setup

1. **Go to Azure Portal**
   - Visit [portal.azure.com](https://portal.azure.com)
   - Sign in with Microsoft account

2. **Register Application**
   - Azure Active Directory → App registrations
   - Click "New registration"
   - Name: "ClosePro CRM"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI:
     - Platform: **Web**
     - URI: `http://localhost:5173/email-settings` (development)
     - Add another: `https://yourdomain.com/email-settings` (production)

3. **Configure API Permissions**
   - Go to "API permissions"
   - Click "Add a permission"
   - Microsoft Graph → Delegated permissions
   - Add:
     - `Mail.Read`
     - `Mail.Send`
     - `User.Read`
   - Click "Grant admin consent" (if you have admin rights)

4. **Create Client Secret**
   - Certificates & secrets → New client secret
   - Copy the **Value** (not the Secret ID)
   - Add to your `.env` file:
     ```
     VITE_OUTLOOK_CLIENT_ID=your-application-id
     VITE_OUTLOOK_CLIENT_SECRET=your-client-secret-value
     ```

## Security Notes

⚠️ **Important**: Client secrets in `.env` are exposed to the browser in Vite apps. For production:

1. **Use a Backend Proxy** (Recommended)
   - Create a backend endpoint that handles OAuth
   - Store secrets server-side only
   - Frontend calls your backend, backend calls OAuth providers

2. **Or Use Supabase Edge Functions**
   - Create Edge Functions to handle OAuth flow
   - Store secrets in Supabase secrets
   - More secure than client-side

3. **Current Implementation**
   - Works for MVP/demo
   - Not recommended for production with many users
   - Fine for testing and small deployments

## Testing

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to Email Settings:**
   - Click "Email Sync" in sidebar
   - Click "Connect Gmail" or "Connect Outlook"

3. **Authorize:**
   - You'll be redirected to Google/Microsoft
   - Sign in and authorize ClosePro
   - You'll be redirected back

4. **Verify:**
   - Account should appear in "Connected Accounts"
   - Click "Sync Now" to test

## Production Deployment

### Update Redirect URIs

Before deploying, update OAuth redirect URIs in:
- **Google Cloud Console**: Add production URL
- **Azure Portal**: Add production URL

### Environment Variables

Add to Vercel/Netlify environment variables:
- `VITE_GMAIL_CLIENT_ID`
- `VITE_GMAIL_CLIENT_SECRET`
- `VITE_OUTLOOK_CLIENT_ID`
- `VITE_OUTLOOK_CLIENT_SECRET`

## Troubleshooting

### "Client ID not configured"
- Check `.env` file exists
- Verify variable names start with `VITE_`
- Restart dev server after adding env vars

### "Failed to exchange code"
- Check redirect URI matches exactly in OAuth provider
- Verify client secret is correct
- Check token hasn't expired

### "Failed to fetch messages"
- Token may have expired
- Click "Sync Now" to refresh
- Reconnect account if needed

## Future Enhancements

- [ ] Backend proxy for OAuth (more secure)
- [ ] Automatic periodic sync (every 15 minutes)
- [ ] Email threading (group related emails)
- [ ] Smart contact creation (create contact from email if not found)
- [ ] Email templates integration (send from templates)
- [ ] Email attachments handling

