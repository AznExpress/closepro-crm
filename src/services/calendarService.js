// Calendar integration service for Google Calendar and Outlook

const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email'
];

const OUTLOOK_CALENDAR_SCOPES = [
  'https://graph.microsoft.com/Calendars.ReadWrite',
  'https://graph.microsoft.com/User.Read'
];

// Get Google Calendar OAuth URL
export function getGoogleCalendarAuthUrl(redirectUri) {
  const clientId = import.meta.env.VITE_GMAIL_CLIENT_ID; // Reuse Gmail client ID
  if (!clientId) {
    throw new Error('Google Client ID not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_CALENDAR_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Get Outlook Calendar OAuth URL
export function getOutlookCalendarAuthUrl(redirectUri) {
  const clientId = import.meta.env.VITE_OUTLOOK_CLIENT_ID; // Reuse Outlook client ID
  if (!clientId) {
    throw new Error('Outlook Client ID not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: OUTLOOK_CALENDAR_SCOPES.join(' '),
    access_type: 'offline'
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

// Exchange authorization code for tokens (reuse email service functions)
export { exchangeGmailCode, exchangeOutlookCode, refreshGmailToken, refreshOutlookToken } from './emailService';

// Get Google Calendar events
export async function getGoogleCalendarEvents(accessToken, timeMin, timeMax, maxResults = 50) {
  const params = new URLSearchParams({
    timeMin: timeMin || new Date().toISOString(),
    timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    maxResults: maxResults.toString(),
    singleEvents: 'true',
    orderBy: 'startTime'
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Google Calendar events');
  }

  const data = await response.json();
  return (data.items || []).map(event => ({
    id: event.id,
    title: event.summary || 'No title',
    description: event.description || '',
    location: event.location || '',
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
    allDay: !event.start.dateTime,
    htmlLink: event.htmlLink,
    externalEventId: event.id,
    provider: 'google'
  }));
}

// Get Outlook Calendar events
export async function getOutlookCalendarEvents(accessToken, startDateTime, endDateTime) {
  const params = new URLSearchParams({
    $filter: `start/dateTime ge '${startDateTime}' and end/dateTime le '${endDateTime}'`,
    $orderby: 'start/dateTime',
    $top: '50'
  });

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendar/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Outlook Calendar events');
  }

  const { value } = await response.json();
  return (value || []).map(event => ({
    id: event.id,
    title: event.subject || 'No title',
    description: event.body?.content || '',
    location: event.location?.displayName || '',
    start: event.start.dateTime,
    end: event.end.dateTime,
    allDay: event.isAllDay || false,
    htmlLink: event.webLink,
    externalEventId: event.id,
    provider: 'outlook'
  }));
}

// Create Google Calendar event
export async function createGoogleCalendarEvent(accessToken, event) {
  const googleEvent = {
    summary: event.title,
    description: event.description || '',
    location: event.location || '',
    start: event.allDay
      ? { date: event.start.split('T')[0] }
      : { dateTime: event.start, timeZone: 'UTC' },
    end: event.allDay
      ? { date: event.end.split('T')[0] }
      : { dateTime: event.end, timeZone: 'UTC' }
  };

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(googleEvent)
    }
  );

  if (!response.ok) {
    throw new Error('Failed to create Google Calendar event');
  }

  const data = await response.json();
  return {
    id: data.id,
    htmlLink: data.htmlLink,
    externalEventId: data.id
  };
}

// Create Outlook Calendar event
export async function createOutlookCalendarEvent(accessToken, event) {
  const outlookEvent = {
    subject: event.title,
    body: {
      contentType: 'HTML',
      content: event.description || ''
    },
    start: {
      dateTime: event.start,
      timeZone: 'UTC'
    },
    end: {
      dateTime: event.end,
      timeZone: 'UTC'
    },
    location: event.location ? {
      displayName: event.location
    } : undefined,
    isAllDay: event.allDay || false
  };

  const response = await fetch(
    'https://graph.microsoft.com/v1.0/me/calendar/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(outlookEvent)
    }
  );

  if (!response.ok) {
    throw new Error('Failed to create Outlook Calendar event');
  }

  const data = await response.json();
  return {
    id: data.id,
    htmlLink: data.webLink,
    externalEventId: data.id
  };
}

// Update Google Calendar event
export async function updateGoogleCalendarEvent(accessToken, eventId, event) {
  const googleEvent = {
    summary: event.title,
    description: event.description || '',
    location: event.location || '',
    start: event.allDay
      ? { date: event.start.split('T')[0] }
      : { dateTime: event.start, timeZone: 'UTC' },
    end: event.allDay
      ? { date: event.end.split('T')[0] }
      : { dateTime: event.end, timeZone: 'UTC' }
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(googleEvent)
    }
  );

  if (!response.ok) {
    throw new Error('Failed to update Google Calendar event');
  }

  return await response.json();
}

// Update Outlook Calendar event
export async function updateOutlookCalendarEvent(accessToken, eventId, event) {
  const outlookEvent = {
    subject: event.title,
    body: {
      contentType: 'HTML',
      content: event.description || ''
    },
    start: {
      dateTime: event.start,
      timeZone: 'UTC'
    },
    end: {
      dateTime: event.end,
      timeZone: 'UTC'
    },
    location: event.location ? {
      displayName: event.location
    } : undefined
  };

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendar/events/${eventId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(outlookEvent)
    }
  );

  if (!response.ok) {
    throw new Error('Failed to update Outlook Calendar event');
  }

  return await response.json();
}

// Delete Google Calendar event
export async function deleteGoogleCalendarEvent(accessToken, eventId) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error('Failed to delete Google Calendar event');
  }
}

// Delete Outlook Calendar event
export async function deleteOutlookCalendarEvent(accessToken, eventId) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendar/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error('Failed to delete Outlook Calendar event');
  }
}

// Get user's primary calendar email (for Google)
export async function getGoogleCalendarEmail(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await response.json();
  return data.email;
}

// Get user's calendar email (for Outlook)
export async function getOutlookCalendarEmail(accessToken) {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await response.json();
  return data.mail || data.userPrincipalName;
}

