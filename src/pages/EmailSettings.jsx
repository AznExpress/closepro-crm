import { useState, useEffect } from 'react';
import { 
  Mail, 
  Check, 
  X, 
  RefreshCw, 
  Trash2,
  ExternalLink,
  AlertCircle,
  Settings,
  Clock
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useCRM } from '../store/CRMContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  getGmailAuthUrl, 
  getOutlookAuthUrl,
  exchangeGmailCode,
  exchangeOutlookCode
} from '../services/emailService';
import { syncEmailAccount } from '../services/emailSync';
import { formatDistanceToNow } from 'date-fns';

export default function EmailSettings() {
  const { user } = useAuth();
  const { contacts } = useCRM();
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});
  const [error, setError] = useState('');
  const [syncResults, setSyncResults] = useState({});

  useEffect(() => {
    loadEmailAccounts();
    
    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state'); // Provider is passed in state
    
    if (code && state && (state === 'gmail' || state === 'outlook')) {
      handleOAuthCallback(code, state);
    }
  }, []);

  const loadEmailAccounts = async () => {
    if (!isSupabaseConfigured() || !user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('email_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmailAccounts(data || []);
    } catch (err) {
      console.error('Error loading email accounts:', err);
      setError('Failed to load email accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthCallback = async (code, provider) => {
    setLoading(true);
    setError('');

    try {
      const redirectUri = `${window.location.origin}/email-settings`;
      let tokenData;

      if (provider === 'gmail') {
        tokenData = await exchangeGmailCode(code, redirectUri);
      } else if (provider === 'outlook') {
        tokenData = await exchangeOutlookCode(code, redirectUri);
      } else {
        throw new Error('Invalid provider');
      }

      // Get user email from provider
      const userEmail = await getUserEmail(provider, tokenData.access_token);

      // Save to database
      const expiresAt = tokenData.expires_in 
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null;

      const { error: dbError } = await supabase
        .from('email_accounts')
        .upsert({
          user_id: user.id,
          provider,
          email: userEmail,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt,
          sync_enabled: true
        }, {
          onConflict: 'user_id,email'
        });

      if (dbError) throw dbError;

      // Clean URL
      window.history.replaceState({}, document.title, '/email-settings');
      
      await loadEmailAccounts();
    } catch (err) {
      console.error('OAuth callback error:', err);
      setError(err.message || 'Failed to connect email account');
    } finally {
      setLoading(false);
    }
  };

  const getUserEmail = async (provider, accessToken) => {
    if (provider === 'gmail') {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await response.json();
      return data.email;
    } else if (provider === 'outlook') {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await response.json();
      return data.mail || data.userPrincipalName;
    }
  };

  const handleConnect = (provider) => {
    const redirectUri = `${window.location.origin}/email-settings`;
    
    let authUrl;
    try {
      if (provider === 'gmail') {
        authUrl = getGmailAuthUrl(redirectUri);
      } else if (provider === 'outlook') {
        authUrl = getOutlookAuthUrl(redirectUri);
      } else {
        throw new Error('Invalid provider');
      }

      // Add provider to URL for callback
      const url = new URL(authUrl);
      url.searchParams.set('state', provider);
      
      window.location.href = url.toString();
    } catch (err) {
      setError(err.message || `Failed to start ${provider} connection`);
    }
  };

  const handleSync = async (accountId) => {
    setSyncing(prev => ({ ...prev, [accountId]: true }));
    setError('');
    setSyncResults(prev => ({ ...prev, [accountId]: null }));

    try {
      const result = await syncEmailAccount(accountId, contacts);
      setSyncResults(prev => ({ ...prev, [accountId]: result }));
      await loadEmailAccounts();
    } catch (err) {
      console.error('Sync error:', err);
      setError(err.message || 'Failed to sync emails');
    } finally {
      setSyncing(prev => ({ ...prev, [accountId]: false }));
    }
  };

  const handleToggleSync = async (accountId, enabled) => {
    try {
      const { error } = await supabase
        .from('email_accounts')
        .update({ sync_enabled: enabled })
        .eq('id', accountId);

      if (error) throw error;
      await loadEmailAccounts();
    } catch (err) {
      setError('Failed to update sync settings');
    }
  };

  const handleDelete = async (accountId) => {
    if (!confirm('Disconnect this email account? This will stop syncing emails.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('email_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
      await loadEmailAccounts();
    } catch (err) {
      setError('Failed to disconnect account');
    }
  };

  const isGmailConfigured = !!import.meta.env.VITE_GMAIL_CLIENT_ID;
  const isOutlookConfigured = !!import.meta.env.VITE_OUTLOOK_CLIENT_ID;

  return (
    <>
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Email Settings</h1>
            <p className="page-subtitle">
              Connect your Gmail or Outlook to automatically log emails as activities
            </p>
          </div>
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
            <span>Email sync requires Supabase. Configure your .env file to enable this feature.</span>
          </div>
        )}

        {/* Connect New Account */}
        <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Connect Email Account</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)', fontSize: '0.875rem' }}>
            Connect your email to automatically sync sent and received emails as activities in your CRM.
          </p>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={() => handleConnect('gmail')}
              disabled={!isGmailConfigured}
            >
              <Mail size={18} />
              Connect Gmail
              {!isGmailConfigured && (
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
              <Mail size={18} />
              Connect Outlook
              {!isOutlookConfigured && (
                <span style={{ fontSize: '0.75rem', marginLeft: '4px', opacity: 0.7 }}>
                  (Not configured)
                </span>
              )}
            </button>
          </div>

          {(!isGmailConfigured || !isOutlookConfigured) && (
            <div style={{ 
              marginTop: 'var(--spacing-md)', 
              padding: 'var(--spacing-md)', 
              background: 'var(--bg-tertiary)', 
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              color: 'var(--text-muted)'
            }}>
              <strong>Setup Required:</strong> Add OAuth credentials to your .env file:
              <pre style={{ 
                marginTop: 'var(--spacing-sm)', 
                padding: 'var(--spacing-sm)', 
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                overflow: 'auto'
              }}>
{`VITE_GMAIL_CLIENT_ID=your-gmail-client-id
VITE_GMAIL_CLIENT_SECRET=your-gmail-secret
VITE_OUTLOOK_CLIENT_ID=your-outlook-client-id
VITE_OUTLOOK_CLIENT_SECRET=your-outlook-secret`}
              </pre>
            </div>
          )}
        </div>

        {/* Connected Accounts */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Connected Accounts</h3>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
              <RefreshCw size={24} className="loading-spinner" />
            </div>
          ) : emailAccounts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Mail size={28} />
              </div>
              <div className="empty-state-title">No email accounts connected</div>
              <p className="text-muted">Connect an account above to start syncing emails</p>
            </div>
          ) : (
            <div className="email-accounts-list">
              {emailAccounts.map(account => (
                <div key={account.id} className="email-account-card">
                  <div className="email-account-header">
                    <div className="email-account-info">
                      <div className="email-account-provider">
                        {account.provider === 'gmail' ? '📧' : '📬'} {account.provider === 'gmail' ? 'Gmail' : 'Outlook'}
                      </div>
                      <div className="email-account-email">{account.email}</div>
                      {account.last_sync_at && (
                        <div className="email-account-sync-time">
                          <Clock size={12} />
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
                  
                  {syncResults[account.id] && (
                    <div className="sync-result" style={{ 
                      marginBottom: 'var(--spacing-sm)',
                      padding: 'var(--spacing-sm)',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      color: 'var(--emerald-400)'
                    }}>
                      ✓ Synced {syncResults[account.id].activitiesCreated} activities from {syncResults[account.id].emailsProcessed} emails
                    </div>
                  )}
                  
                  <div className="email-account-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleSync(account.id)}
                      disabled={syncing[account.id]}
                    >
                      <RefreshCw size={14} className={syncing[account.id] ? 'spinning' : ''} />
                      {syncing[account.id] ? 'Syncing...' : 'Sync Now'}
                    </button>
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
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>How Email Sync Works</h3>
          <div className="email-sync-info">
            <div className="sync-step">
              <div className="sync-step-number">1</div>
              <div>
                <strong>Connect your email</strong>
                <p>Authorize ClosePro to access your Gmail or Outlook account</p>
              </div>
            </div>
            <div className="sync-step">
              <div className="sync-step-number">2</div>
              <div>
                <strong>Automatic matching</strong>
                <p>Emails are matched to contacts by email address</p>
              </div>
            </div>
            <div className="sync-step">
              <div className="sync-step-number">3</div>
              <div>
                <strong>Activity logging</strong>
                <p>Sent and received emails are logged as activities in your CRM</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

