// Email sync service - syncs emails and creates activities
import { supabase } from '../lib/supabase';
import { getGmailMessages, getOutlookMessages, extractEmailAddress, matchEmailToContact } from './emailService';
import { refreshGmailToken, refreshOutlookToken } from './emailService';

export async function syncEmailAccount(accountId, contacts) {
  try {
    // Get account from database
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      throw new Error('Account not found');
    }

    // Check if token needs refresh
    let accessToken = account.access_token;
    if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
      if (!account.refresh_token) {
        throw new Error('Token expired and no refresh token available');
      }

      // Refresh token
      let tokenData;
      if (account.provider === 'gmail') {
        tokenData = await refreshGmailToken(account.refresh_token);
      } else {
        tokenData = await refreshOutlookToken(account.refresh_token);
      }

      accessToken = tokenData.access_token;

      // Update token in database
      const expiresAt = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null;

      await supabase
        .from('email_accounts')
        .update({
          access_token: accessToken,
          refresh_token: tokenData.refresh_token || account.refresh_token,
          token_expires_at: expiresAt
        })
        .eq('id', accountId);
    }

    // Fetch emails
    let emails;
    if (account.provider === 'gmail') {
      emails = await getGmailMessages(accessToken, 50);
    } else {
      emails = await getOutlookMessages(accessToken, 50);
    }

    // Process emails and create activities
    const activitiesCreated = [];
    
    for (const email of emails) {
      // Extract email addresses
      const fromEmail = extractEmailAddress(email.from);
      const toEmails = email.to.split(',').map(e => extractEmailAddress(e.trim()));

      // Match to contact
      const contact = matchEmailToContact(fromEmail, contacts) || 
                     toEmails.map(e => matchEmailToContact(e, contacts)).find(c => c);

      if (!contact) {
        // No matching contact - skip or create new contact?
        // For now, we'll skip
        continue;
      }

      // Check if activity already exists (prevent duplicates)
      const { data: existing } = await supabase
        .from('activities')
        .select('id')
        .eq('contact_id', contact.id)
        .eq('note', `Email: ${email.subject}`)
        .single();

      if (existing) {
        continue; // Already logged
      }

      // Create activity
      const activityNote = `Email: ${email.subject}${email.snippet ? ` - ${email.snippet.substring(0, 100)}` : ''}`;
      
      const { error: activityError } = await supabase
        .from('activities')
        .insert({
          user_id: account.user_id,
          contact_id: contact.id,
          type: 'email',
          note: activityNote
        });

      if (!activityError) {
        activitiesCreated.push({
          contactId: contact.id,
          contactName: `${contact.firstName} ${contact.lastName}`,
          subject: email.subject
        });
      }
    }

    // Update last_sync_at
    await supabase
      .from('email_accounts')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', accountId);

    return {
      success: true,
      emailsProcessed: emails.length,
      activitiesCreated: activitiesCreated.length,
      details: activitiesCreated
    };

  } catch (error) {
    console.error('Email sync error:', error);
    throw error;
  }
}

// Sync all enabled accounts
export async function syncAllEmailAccounts(contacts) {
  const { data: accounts } = await supabase
    .from('email_accounts')
    .select('*')
    .eq('sync_enabled', true);

  if (!accounts || accounts.length === 0) {
    return { synced: 0, errors: [] };
  }

  const results = [];
  const errors = [];

  for (const account of accounts) {
    try {
      const result = await syncEmailAccount(account.id, contacts);
      results.push(result);
    } catch (error) {
      errors.push({
        account: account.email,
        error: error.message
      });
    }
  }

  return {
    synced: results.length,
    totalActivities: results.reduce((sum, r) => sum + r.activitiesCreated, 0),
    errors
  };
}

