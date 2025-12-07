// Email sync service for Gmail and Outlook
// This service handles OAuth and email operations

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email'
];

const OUTLOOK_SCOPES = [
  'https://graph.microsoft.com/Mail.Read',
  'https://graph.microsoft.com/Mail.Send',
  'https://graph.microsoft.com/User.Read'
];

// Gmail OAuth URL
export function getGmailAuthUrl(redirectUri) {
  const clientId = import.meta.env.VITE_GMAIL_CLIENT_ID;
  if (!clientId) {
    throw new Error('Gmail Client ID not configured. Add VITE_GMAIL_CLIENT_ID to .env');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Outlook OAuth URL
export function getOutlookAuthUrl(redirectUri) {
  const clientId = import.meta.env.VITE_OUTLOOK_CLIENT_ID;
  if (!clientId) {
    throw new Error('Outlook Client ID not configured. Add VITE_OUTLOOK_CLIENT_ID to .env');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: OUTLOOK_SCOPES.join(' '),
    access_type: 'offline'
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

// Exchange Gmail authorization code for tokens
export async function exchangeGmailCode(code, redirectUri) {
  const clientId = import.meta.env.VITE_GMAIL_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_GMAIL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Gmail credentials not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to exchange code');
  }

  return await response.json();
}

// Exchange Outlook authorization code for tokens
export async function exchangeOutlookCode(code, redirectUri) {
  const clientId = import.meta.env.VITE_OUTLOOK_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_OUTLOOK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Outlook credentials not configured');
  }

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to exchange code');
  }

  return await response.json();
}

// Refresh Gmail token
export async function refreshGmailToken(refreshToken) {
  const clientId = import.meta.env.VITE_GMAIL_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_GMAIL_CLIENT_SECRET;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  return await response.json();
}

// Refresh Outlook token
export async function refreshOutlookToken(refreshToken) {
  const clientId = import.meta.env.VITE_OUTLOOK_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_OUTLOOK_CLIENT_SECRET;

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  return await response.json();
}

// Get Gmail messages
export async function getGmailMessages(accessToken, maxResults = 50) {
  // First, get message IDs
  const listResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=is:unread OR in:sent`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!listResponse.ok) {
    throw new Error('Failed to fetch Gmail messages');
  }

  const { messages } = await listResponse.json();
  if (!messages || messages.length === 0) return [];

  // Fetch full message details
  const messagePromises = messages.map(msg =>
    fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }).then(r => r.json())
  );

  const fullMessages = await Promise.all(messagePromises);

  return fullMessages.map(msg => ({
    id: msg.id,
    threadId: msg.threadId,
    from: msg.payload.headers.find(h => h.name === 'From')?.value || '',
    to: msg.payload.headers.find(h => h.name === 'To')?.value || '',
    subject: msg.payload.headers.find(h => h.name === 'Subject')?.value || '',
    date: msg.payload.headers.find(h => h.name === 'Date')?.value || '',
    snippet: msg.snippet,
    body: extractEmailBody(msg.payload),
    isUnread: msg.labelIds?.includes('UNREAD') || false
  }));
}

// Get Outlook messages
export async function getOutlookMessages(accessToken, maxResults = 50) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?$top=${maxResults}&$filter=isRead eq false or sentDateTime ge ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}&$orderby=sentDateTime desc`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Outlook messages');
  }

  const { value } = await response.json();
  if (!value) return [];

  return value.map(msg => ({
    id: msg.id,
    from: msg.from?.emailAddress?.address || '',
    to: msg.toRecipients?.map(r => r.emailAddress.address).join(', ') || '',
    subject: msg.subject || '',
    date: msg.sentDateTime || msg.receivedDateTime,
    body: msg.body?.content || '',
    isUnread: !msg.isRead
  }));
}

// Extract email body from Gmail payload
function extractEmailBody(payload) {
  if (payload.body?.data) {
    return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }
      if (part.mimeType === 'text/html' && part.body?.data) {
        return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }
    }
  }

  return '';
}

// Send email via Gmail
export async function sendGmailEmail(accessToken, to, subject, body) {
  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    body
  ].join('\n');

  const encodedEmail = btoa(email)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      raw: encodedEmail
    })
  });

  if (!response.ok) {
    throw new Error('Failed to send email');
  }

  return await response.json();
}

// Send email via Outlook
export async function sendOutlookEmail(accessToken, to, subject, body) {
  const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        toRecipients: [{ emailAddress: { address: to } }],
        subject,
        body: {
          contentType: 'HTML',
          content: body
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error('Failed to send email');
  }

  return response;
}

// Extract email address from email string
export function extractEmailAddress(emailString) {
  const match = emailString.match(/<(.+)>/);
  return match ? match[1] : emailString.trim();
}

// Match email to contact
export function matchEmailToContact(emailAddress, contacts) {
  const normalizedEmail = emailAddress.toLowerCase();
  return contacts.find(c => 
    c.email?.toLowerCase() === normalizedEmail ||
    normalizedEmail.includes(c.email?.toLowerCase())
  );
}

