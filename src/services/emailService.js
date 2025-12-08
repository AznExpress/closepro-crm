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

// PKCE helper functions
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

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

// Outlook OAuth URL with PKCE
export async function getOutlookAuthUrl(redirectUri) {
  const clientId = import.meta.env.VITE_OUTLOOK_CLIENT_ID;
  if (!clientId) {
    throw new Error('Outlook Client ID not configured. Add VITE_OUTLOOK_CLIENT_ID to .env');
  }

  // Normalize redirect URI (remove trailing slash) to match what we'll use in token exchange
  const normalizedRedirectUri = redirectUri.replace(/\/$/, '');

  // Generate PKCE parameters
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  // Store code_verifier in multiple places for maximum reliability
  // Use provider-specific keys as well as generic keys
  const timestamp = Date.now().toString();
  
  // Store in sessionStorage with multiple key names
  sessionStorage.setItem('oauth_code_verifier', codeVerifier);
  sessionStorage.setItem('oauth_code_verifier_time', timestamp);
  sessionStorage.setItem('outlook_code_verifier', codeVerifier);
  sessionStorage.setItem('outlook_code_verifier_time', timestamp);
  
  // Store in localStorage with multiple key names (more persistent)
  localStorage.setItem('oauth_code_verifier', codeVerifier);
  localStorage.setItem('oauth_code_verifier_time', timestamp);
  localStorage.setItem('outlook_code_verifier', codeVerifier);
  localStorage.setItem('outlook_code_verifier_time', timestamp);
  
  console.log('[Outlook OAuth] Generated and stored PKCE code verifier in multiple locations:', {
    codeVerifierLength: codeVerifier.length,
    timestamp,
    storedIn: ['sessionStorage (oauth_code_verifier)', 'sessionStorage (outlook_code_verifier)', 'localStorage (oauth_code_verifier)', 'localStorage (outlook_code_verifier)']
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: normalizedRedirectUri,
    response_type: 'code',
    scope: OUTLOOK_SCOPES.join(' '),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'consent' // Force consent to get refresh token
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

// Exchange Outlook authorization code for tokens with PKCE
export async function exchangeOutlookCode(code, redirectUri) {
  const clientId = import.meta.env.VITE_OUTLOOK_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_OUTLOOK_CLIENT_SECRET;

  if (!clientId) {
    throw new Error('Outlook Client ID not configured. Add VITE_OUTLOOK_CLIENT_ID to .env');
  }

  // Ensure redirect URI has no trailing slash
  const normalizedRedirectUri = redirectUri.replace(/\/$/, '');

  // Get code_verifier from storage (required for PKCE)
  // Check both sessionStorage and localStorage, and also check for provider-specific keys
  let codeVerifier = sessionStorage.getItem('oauth_code_verifier') || 
                     sessionStorage.getItem('outlook_code_verifier') ||
                     localStorage.getItem('oauth_code_verifier') ||
                     localStorage.getItem('outlook_code_verifier');
  
  let verifierTime = sessionStorage.getItem('oauth_code_verifier_time') ||
                     sessionStorage.getItem('outlook_code_verifier_time') ||
                     localStorage.getItem('oauth_code_verifier_time') ||
                     localStorage.getItem('outlook_code_verifier_time');
  
  // Debug: Log all storage keys to see what's available
  console.log('[Outlook OAuth] Storage check:', {
    sessionStorageKeys: Object.keys(sessionStorage).filter(k => k.includes('oauth') || k.includes('code')),
    localStorageKeys: Object.keys(localStorage).filter(k => k.includes('oauth') || k.includes('code')),
    hasVerifier: !!codeVerifier,
    verifierLength: codeVerifier?.length,
    verifierTime: verifierTime,
    timeDiff: verifierTime ? Date.now() - parseInt(verifierTime) : null
  });
  
  // Check if code_verifier is recent (within last 10 minutes)
  const isRecent = verifierTime && (Date.now() - parseInt(verifierTime)) < 10 * 60 * 1000;
  
  if (!codeVerifier) {
    // Last resort: check if there's a code verifier stored with a different key pattern
    const allSessionKeys = Object.keys(sessionStorage);
    const allLocalKeys = Object.keys(localStorage);
    const possibleVerifier = [...allSessionKeys, ...allLocalKeys]
      .find(key => key.includes('verifier') || key.includes('pkce'));
    
    if (possibleVerifier) {
      console.warn('[Outlook OAuth] Found possible verifier key:', possibleVerifier);
      codeVerifier = sessionStorage.getItem(possibleVerifier) || localStorage.getItem(possibleVerifier);
    }
  }
  
  if (!codeVerifier) {
    throw new Error('PKCE code verifier missing. The code verifier may have been cleared during the redirect. Please try connecting again.');
  }
  
  if (!isRecent) {
    console.warn('[Outlook OAuth] Code verifier may be expired, but attempting to use it anyway');
    // Don't throw error for expired verifier, just warn - the server will reject if truly expired
  }

  // Build request body
  const bodyParams = new URLSearchParams({
    code,
    client_id: clientId,
    redirect_uri: normalizedRedirectUri,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier // Required for PKCE
  });

  // Don't include client_secret for SPA apps with PKCE
  // Only include if explicitly provided (for "Web" app type, though not recommended)
  if (clientSecret) {
    bodyParams.append('client_secret', clientSecret);
  }

  // Clean up stored code_verifier after use (from both storage locations)
  sessionStorage.removeItem('oauth_code_verifier');
  sessionStorage.removeItem('oauth_code_verifier_time');
  localStorage.removeItem('oauth_code_verifier');
  localStorage.removeItem('oauth_code_verifier_time');

  console.log('[Outlook OAuth] Exchanging code with:', {
    redirectUri: normalizedRedirectUri,
    hasClientSecret: !!clientSecret,
    clientId: clientId.substring(0, 10) + '...'
  });

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: bodyParams
  });

  if (!response.ok) {
    let errorMessage = 'Failed to exchange authorization code';
    let errorDetails = {};
    
    try {
      const error = await response.json();
      errorDetails = error;
      const errorDesc = error.error_description || error.error || 'Unknown error';
      const errorCode = error.error || '';
      
      console.error('[Outlook OAuth] Error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorDetails
      });
      
      // Provide helpful error messages for common issues
      if (errorDesc.includes('expired') || errorDesc.includes('AADSTS70000') || errorCode === 'invalid_grant') {
        errorMessage = `Authorization code expired or invalid.\n\n` +
          `Possible causes:\n` +
          `1. Redirect URI mismatch - Must be exactly: ${normalizedRedirectUri}\n` +
          `2. Code already used or expired\n` +
          `3. Delay between authorization and exchange\n\n` +
          `Solution: Try connecting again. Verify redirect URI in Azure Portal matches exactly.`;
      } else if (errorDesc.includes('redirect_uri') || errorDesc.includes('AADSTS50011')) {
        errorMessage = `Redirect URI mismatch (AADSTS50011).\n\n` +
          `Required redirect URI: ${normalizedRedirectUri}\n\n` +
          `In Azure Portal:\n` +
          `1. Go to App registrations → Your app → Authentication\n` +
          `2. Under "Redirect URIs", add exactly: ${normalizedRedirectUri}\n` +
          `3. Make sure there are no trailing slashes\n` +
          `4. Click Save and wait 1-2 minutes`;
      } else if (errorDesc.includes('client_secret') || errorDesc.includes('AADSTS7000215')) {
        errorMessage = `Client secret issue.\n\n` +
          `If your app is configured as a "Public client" (SPA), you may not need a client secret.\n` +
          `Check Azure Portal → Your app → Authentication → Platform configurations\n` +
          `Error details: ${errorDesc}`;
      } else if (errorDesc.includes('invalid_client')) {
        errorMessage = `Invalid client ID or secret.\n\n` +
          `Verify in Azure Portal:\n` +
          `1. Application (client) ID matches VITE_OUTLOOK_CLIENT_ID\n` +
          `2. Client secret is correct (if required)\n` +
          `3. App is enabled\n` +
          `Error: ${errorDesc}`;
      } else {
        errorMessage = `${errorDesc}\n\n` +
          `Error Code: ${errorCode}\n` +
          `Redirect URI used: ${normalizedRedirectUri}\n` +
          `Check browser console for full error details.`;
      }
    } catch (e) {
      // If we can't parse the error, use the status text
      const responseText = await response.text();
      console.error('[Outlook OAuth] Raw error response:', responseText);
      errorMessage = `HTTP ${response.status}: ${response.statusText}\n\n` +
        `Response: ${responseText.substring(0, 200)}`;
    }
    
    throw new Error(errorMessage);
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

