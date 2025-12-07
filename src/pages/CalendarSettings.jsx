import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar as CalendarIcon,
  Check,
  X,
  RefreshCw,
  Trash2,
  ExternalLink,
  AlertCircle,
  Settings
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  getGoogleCalendarAuthUrl, 
  getOutlookCalendarAuthUrl,
  exchangeGmailCode,
  exchangeOutlookCode,
  getGoogleCalendarEmail,
  getOutlookCalendarEmail
} from '../services/calendarService';
import { formatDistanceToNow } from 'date-fns';

export default function CalendarSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [calendarAccounts, setCalendarAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCalendarAccounts();
    
    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state && (state === 'google' || state === 'outlook')) {
      handleOAuthCallback(code, state);
    }
  }, []);

  const loadCalendarAccounts = async () => {
    if (!isSupabaseConfigured() || !user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: accountsError } = await supabase
        .from('calendar_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (accountsError) throw accountsError;
      setCalendarAccounts(data || []);
    } catch (err) {
      console.error('Error loading calendar accounts:', err);
      setError('Failed to load calendar accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthCallback = async (code, provider) => {
    setLoading(true);
    setError('');

    try {
      const redirectUri = `${window.location.origin}/calendar-settings`;
      let tokenData;
      let userEmail;

      if (provider === 'google') {
        tokenData = await exchangeGmailCode(code, redirectUri);
        userEmail = await getGoogleCalendarEmail(tokenData.access_token);
      } else if (provider === 'outlook') {
        tokenData = await exchangeOutlookCode(code, redirectUri);
        userEmail = await getOutlookCalendarEmail(tokenData.access_token);
      } else {
        throw new Error('Invalid provider');
      }

      const expiresAt = tokenData.expires_in 
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null;

      const { error: dbError } = await supabase
        .from('calendar_accounts')
        .upsert({
          user_id: user.id,
          provider,
          email: userEmail,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt,
          sync_enabled: true,
          calendar_id: 'primary'
        }, {
          onConflict: 'user_id,email'
        });

      if (dbError) throw dbError;

      window.history.replaceState({}, document.title, '/calendar-settings');
      await loadCalendarAccounts();
    } catch (err) {
      console.error('OAuth callback error:', err);
      setError(err.message || 'Failed to connect calendar account');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (provider) => {
    const redirectUri = `${window.location.origin}/calendar-settings`;
    
    let authUrl;
    try {
      if (provider === 'google') {
        authUrl = getGoogleCalendarAuthUrl(redirectUri);
      } else if (provider === 'outlook') {
        authUrl = getOutlookCalendarAuthUrl(redirectUri);
      } else {
        throw new Error('Invalid provider');
      }

      const url = new URL(authUrl);
      url.searchParams.set('state', provider);
      window.location.href = url.toString();
    } catch (err) {
      setError(err.message || `Failed to start ${provider} connection`);
    }
  };

  const handleToggleSync = async (accountId, enabled) => {
    try {
      const { error } = await supabase
        .from('calendar_accounts')
        .update({ sync_enabled: enabled })
        .eq('id', accountId);

      if (error) throw error;
      await loadCalendarAccounts();
    } catch (err) {
      setError('Failed to update sync settings');
    }
  };

  const handleDelete = async (accountId) => {
    if (!confirm('Disconnect this calendar account? This will stop syncing events.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('calendar_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
      await loadCalendarAccounts();
    } catch (err) {
      setError('Failed to disconnect account');
    }
  };

  const isGoogleConfigured = !!import.meta.env.VITE_GMAIL_CLIENT_ID;
  const isOutlookConfigured = !!import.meta.env.VITE_OUTLOOK_CLIENT_ID;

  return (
    <>
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Calendar Settings</h1>
            <p className="page-subtitle">
              Connect your calendar to sync events automatically
            </p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/calendar')}>
            <CalendarIcon size={18} />
            Back to Calendar
          </button>
        </div>
      </header>

      <div className="page-content">
        {error && (
          <div className="auth-error" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {!isSupabaseConfigured() && (
          <div className="demo-banner" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <AlertCircle size={16} />
            <span>Calendar sync requires Supabase. Configure your .env file to enable this feature.</span>
          </div>
        )}

        {/* Connect Calendar */}
        <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Connect Calendar</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)', fontSize: '0.875rem' }}>
            Connect your Google Calendar or Outlook to sync events and create calendar entries from your CRM.
          </p>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={() => handleConnect('google')}
              disabled={!isGoogleConfigured}
            >
              <CalendarIcon size={18} />
              Connect Google Calendar
              {!isGoogleConfigured && (
                <span style={{ fontSize: '0.75rem', marginLeft: '4px', opacity: 0.7 }}>
                  (Not configured)
                </span>
              )}
            </button>
            
            <button
              className="btn btn-secondary"
              onClick={() => handleConnect('outlook')}
              disabled={!isOutlookConfigured}
            >
              <CalendarIcon size={18} />
              Connect Outlook Calendar
              {!isOutlookConfigured && (
                <span style={{ fontSize: '0.75rem', marginLeft: '4px', opacity: 0.7 }}>
                  (Not configured)
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Connected Accounts */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Connected Calendars</h3>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
              <RefreshCw size={24} className="loading-spinner" />
            </div>
          ) : calendarAccounts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <CalendarIcon size={28} />
              </div>
              <div className="empty-state-title">No calendars connected</div>
              <p className="text-muted">Connect a calendar above to start syncing events</p>
            </div>
          ) : (
            <div className="email-accounts-list">
              {calendarAccounts.map(account => (
                <div key={account.id} className="email-account-card">
                  <div className="email-account-header">
                    <div className="email-account-info">
                      <div className="email-account-provider">
                        {account.provider === 'google' ? '📅' : '📬'} {account.provider === 'google' ? 'Google Calendar' : 'Outlook Calendar'}
                      </div>
                      <div className="email-account-email">{account.email}</div>
                      {account.last_sync_at && (
                        <div className="email-account-sync-time">
                          <RefreshCw size={12} />
                          Last synced {formatDistanceToNow(new Date(account.last_sync_at), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                    <div className="email-account-status">
                      {account.sync_enabled ? (
                        <span className="badge badge-success">
                          <Check size={12} />
                          Syncing
                        </span>
                      ) : (
                        <span className="badge badge-cold">Paused</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="email-account-actions">
                    <button
                      className={`btn btn-sm ${account.sync_enabled ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => handleToggleSync(account.id, !account.sync_enabled)}
                    >
                      {account.sync_enabled ? 'Pause' : 'Resume'} Sync
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(account.id)}
                    >
                      <Trash2 size={14} />
                      Disconnect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* How It Works */}
        <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>How Calendar Sync Works</h3>
          <div className="email-sync-info">
            <div className="sync-step">
              <div className="sync-step-number">1</div>
              <div>
                <strong>Connect your calendar</strong>
                <p>Authorize ClosePro to access your Google or Outlook calendar</p>
              </div>
            </div>
            <div className="sync-step">
              <div className="sync-step-number">2</div>
              <div>
                <strong>Create events in CRM</strong>
                <p>When you create events, they can be synced to your calendar</p>
              </div>
            </div>
            <div className="sync-step">
              <div className="sync-step-number">3</div>
              <div>
                <strong>Two-way sync</strong>
                <p>Events appear in both your CRM and your calendar app</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

