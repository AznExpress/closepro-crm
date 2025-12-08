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

1. **Create Free Azure Account** (If using personal Microsoft account)
   - Visit [azure.microsoft.com/free](https://azure.microsoft.com/free)
   - Sign up with your Microsoft account (live.com, outlook.com, hotmail.com)
   - Complete verification (credit card may be required but won't be charged for free tier)
   - This gives you access to Azure Portal with your personal account
   - **Note**: App registrations are completely free - you won't be charged for OAuth setup

2. **Go to Azure Portal**
   - Visit [portal.azure.com](https://portal.azure.com)
   - Sign in with your Microsoft account (should work after step 1)

3. **Register Application**
   - Azure Active Directory → App registrations
   - Click "New registration"
   - Name: "ClosePro CRM"
   - Supported account types: **"Accounts in any organizational directory and personal Microsoft accounts"** (important!)
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

## Verification Checklist

### Step 1: Verify Environment Variables

**Check your `.env` file exists and has the correct variables:**

```bash
# In your project root, verify .env file contains:
VITE_GMAIL_CLIENT_ID=your-gmail-client-id.apps.googleusercontent.com
VITE_GMAIL_CLIENT_SECRET=your-gmail-secret
VITE_OUTLOOK_CLIENT_ID=your-outlook-application-id
VITE_OUTLOOK_CLIENT_SECRET=your-outlook-secret
```

**Quick Check:**
- ✅ `.env` file exists in project root
- ✅ All 4 variables are present
- ✅ No typos in variable names (must start with `VITE_`)
- ✅ Values are not empty or placeholder text

### Step 2: Verify OAuth Credentials Setup

#### Gmail Credentials Verification

1. **Go to Google Cloud Console:**
   - Visit [console.cloud.google.com](https://console.cloud.google.com)
   - Select your project

2. **Check OAuth Consent Screen:**
   - APIs & Services → OAuth consent screen
   - Should show "Testing" or "In production"
   - User type should be configured

3. **Verify OAuth Client:**
   - APIs & Services → Credentials
   - Find your OAuth 2.0 Client ID
   - Click on it to view details
   - **Verify redirect URIs include:**
     - `http://localhost:5173/email-settings` (for development)
     - Your production URL (if deployed)

4. **Check Gmail API:**
   - APIs & Services → Library
   - Search "Gmail API"
   - Should show "Enabled" ✅

#### Outlook Credentials Verification

1. **Go to Azure Portal:**
   - Visit [portal.azure.com](https://portal.azure.com)
   - Azure Active Directory → App registrations
   - Click on your app ("ClosePro CRM")

2. **Verify Application (Client) ID:**
   - Overview page → **Application (client) ID**
   - Copy this value - should match `VITE_OUTLOOK_CLIENT_ID` in your `.env`

3. **Verify Platform Configuration (CRITICAL):**
   - Authentication → Platform configurations
   - **MUST be configured as "Single-page application" (SPA), NOT "Web"**
   - If you see "Web" platform, you need to:
     1. Click on the "Web" platform entry
     2. Click "Delete" to remove it
     3. Click "+ Add a platform"
     4. Select "Single-page application"
     5. Add redirect URI: `http://localhost:5173/email-settings`
     6. Click "Configure"
   - **Why?** Browser-based apps cannot use client secrets securely. SPA platform allows token redemption from the browser.

4. **Verify Redirect URIs:**
   - Under the "Single-page application" platform
   - Should include:
     - `http://localhost:5173/email-settings` (for development)
     - Your production URL (if deployed)
   - **No trailing slashes!**

4. **Verify API Permissions:**
   - API permissions → Should show:
     - ✅ `Mail.Read` (Delegated)
     - ✅ `Mail.Send` (Delegated)
     - ✅ `User.Read` (Delegated)
   - Status should be "Granted" (green checkmark)

5. **Client Secret (NOT NEEDED for SPA):**
   - If your app is configured as "Single-page application", you **do NOT need** a client secret
   - The `VITE_OUTLOOK_CLIENT_SECRET` in `.env` can be left empty or removed
   - Client secrets are only needed for "Web" platform apps (server-side)
   - **Note:** The code will work with or without a client secret for SPA apps

### Step 3: Verify Application Setup

1. **Restart Dev Server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```
   - Environment variables are only loaded on server start
   - Must restart after changing `.env`

2. **Check Browser Console:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for any errors about missing client IDs
   - Should NOT see: "Client ID not configured" errors

3. **Navigate to Email Settings:**
   - In your app, click "Email Sync" in sidebar
   - Should see "Connect Gmail" and "Connect Outlook" buttons
   - If buttons are missing or disabled, check console for errors

### Step 4: Test Gmail Connection

1. **Click "Connect Gmail":**
   - Should redirect to Google sign-in
   - If you see "redirect_uri_mismatch" error:
     - Check redirect URI in Google Cloud Console matches exactly
     - Must include protocol (`http://` or `https://`)
     - Must match your current URL

2. **Authorize Access:**
   - Sign in with your Google account
   - Review permissions (Gmail read/send)
   - Click "Allow" or "Continue"

3. **Verify Redirect Back:**
   - Should redirect back to `/email-settings`
   - Should see success message
   - Account should appear in "Connected Accounts" list

4. **Test Sync:**
   - Click "Sync Now" button
   - Should see "Syncing..." indicator
   - Check browser console for any errors
   - Emails should appear in contact activity timelines

### Step 5: Test Outlook Connection

1. **Click "Connect Outlook":**
   - Should redirect to Microsoft sign-in
   - If you see "AADSTS50011" error:
     - Check redirect URI in Azure Portal matches exactly
     - Must match your current URL

2. **Authorize Access:**
   - Sign in with your Microsoft account
   - Review permissions (Mail read/send)
   - Click "Accept"

3. **Verify Redirect Back:**
   - Should redirect back to `/email-settings`
   - Should see success message
   - Account should appear in "Connected Accounts" list

4. **Test Sync:**
   - Click "Sync Now" button
   - Should see "Syncing..." indicator
   - Check browser console for any errors
   - Emails should appear in contact activity timelines

### Step 6: Verify Email Sync Functionality

1. **Send a Test Email:**
   - Send an email from your connected account to a contact's email
   - Or send from contact's email to your connected account

2. **Check Activity Timeline:**
   - Go to the contact's detail page
   - Look in the Activity Timeline
   - Should see the email logged as an activity
   - Should show sender, recipient, subject, and timestamp

3. **Verify Email Parsing:**
   - Click on the email activity
   - Should show email content
   - Should be linked to the correct contact

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
   - Check contact activity timelines for synced emails

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

### Azure Portal Access Error: "AADSTS50020: User account does not exist in tenant"

**Problem**: You're trying to access Azure Portal with a personal Microsoft account (live.com, outlook.com, hotmail.com) that hasn't been set up for Azure.

**Solutions**:

1. **Create Free Azure Account** (Recommended)
   - Go to [azure.microsoft.com/free](https://azure.microsoft.com/free)
   - Click "Start free" and sign up with your Microsoft account
   - Complete verification (credit card may be required but free tier won't charge)
   - Once set up, you can access Azure Portal with your personal account
   - **Note**: Free tier includes $200 credit for 30 days, then pay-as-you-go (app registration is free)

2. **Use Microsoft 365 Developer Program** (Alternative)
   - Visit [developer.microsoft.com/microsoft-365/dev-program](https://developer.microsoft.com/microsoft-365/dev-program)
   - Sign up for free developer account
   - Includes Azure AD access for testing

3. **Use Work/School Account** (If available)
   - If you have access to a work or school Microsoft account, use that instead
   - These accounts typically have Azure access already configured

4. **Alternative: Use Gmail Only** (Temporary)
   - You can proceed with just Gmail OAuth for now
   - Add Outlook support later when Azure account is set up

**After Creating Azure Account**:
- Wait 5-10 minutes for account to fully activate
- Sign out and sign back into Azure Portal
- You should now be able to access "App registrations"

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

## Quick Verification Checklist

Use this checklist to quickly verify your setup:

### ✅ Pre-Setup Verification
- [ ] `.env` file exists in project root
- [ ] All 4 environment variables are set (`VITE_GMAIL_CLIENT_ID`, `VITE_GMAIL_CLIENT_SECRET`, `VITE_OUTLOOK_CLIENT_ID`, `VITE_OUTLOOK_CLIENT_SECRET`)
- [ ] No placeholder text in values (e.g., not "your-client-id-here")
- [ ] Dev server restarted after adding env vars

### ✅ Gmail Setup Verification
- [ ] Google Cloud project created
- [ ] Gmail API enabled
- [ ] OAuth 2.0 Client ID created
- [ ] Redirect URI added: `http://localhost:5173/email-settings`
- [ ] Client ID and Secret copied to `.env`

### ✅ Outlook Setup Verification
- [ ] Azure account created (if using personal Microsoft account)
- [ ] App registration created in Azure Portal
- [ ] Application (Client) ID copied to `.env`
- [ ] Redirect URI added: `http://localhost:5173/email-settings`
- [ ] API permissions added: `Mail.Read`, `Mail.Send`, `User.Read`
- [ ] Client secret created and copied to `.env`

### ✅ Connection Testing
- [ ] "Connect Gmail" button appears in Email Settings page
- [ ] "Connect Outlook" button appears in Email Settings page
- [ ] Clicking "Connect Gmail" redirects to Google sign-in
- [ ] Clicking "Connect Outlook" redirects to Microsoft sign-in
- [ ] After authorization, redirects back to app successfully
- [ ] Account appears in "Connected Accounts" list
- [ ] "Sync Now" button works without errors
- [ ] Emails appear in contact activity timelines

### ✅ Functionality Testing
- [ ] Sent emails are logged as activities
- [ ] Received emails are logged as activities
- [ ] Emails are matched to correct contacts
- [ ] Email content is visible in activity timeline
- [ ] No console errors during sync

**If all checkboxes are ✅, your email sync is properly configured!**

## Future Enhancements

- [ ] Backend proxy for OAuth (more secure)
- [ ] Automatic periodic sync (every 15 minutes)
- [ ] Email threading (group related emails)
- [ ] Smart contact creation (create contact from email if not found)
- [ ] Email templates integration (send from templates)
- [ ] Email attachments handling

