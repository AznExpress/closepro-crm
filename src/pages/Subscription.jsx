import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard,
  CheckCircle,
  XCircle,
  Calendar,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PLANS, formatPrice, isSubscriptionActive, createPortalSession } from '../services/stripeService';
import { format } from 'date-fns';

export default function Subscription() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadSubscription();
    }
  }, [user]);

  const loadSubscription = async () => {
    if (!isSupabaseConfigured() || !user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subError && subError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw subError;
      }

      setSubscription(data);
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError('Failed to load subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!subscription?.stripe_customer_id) {
      setError('No customer ID found');
      return;
    }

    try {
      const portalUrl = await createPortalSession(subscription.stripe_customer_id);
      window.location.href = portalUrl;
    } catch (err) {
      setError('Failed to open billing portal. See STRIPE_SETUP.md for backend setup.');
    }
  };

  const currentPlan = subscription ? PLANS.find(p => p.id === subscription.plan_name) : null;
  const isActive = isSubscriptionActive(subscription);

  if (loading) {
    return (
      <div className="page-content">
        <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
          <RefreshCw size={32} className="loading-spinner" />
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Subscription</h1>
            <p className="page-subtitle">
              Manage your subscription and billing
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

        {!subscription ? (
          // No subscription
          <div className="card">
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
              <CreditCard size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-md)' }} />
              <h2 style={{ marginBottom: 'var(--spacing-sm)' }}>No Active Subscription</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
                Get started with a plan to unlock all features
              </p>
              <button 
                className="btn btn-primary btn-lg"
                onClick={() => navigate('/pricing')}
              >
                View Plans
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        ) : (
          // Has subscription
          <div style={{ display: 'grid', gap: 'var(--spacing-xl)' }}>
            {/* Current Plan */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                  <h3 style={{ marginBottom: 'var(--spacing-xs)' }}>Current Plan</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                      {isActive ? (
                        <>
                          <CheckCircle size={12} />
                          {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                        </>
                      ) : (
                        <>
                          <XCircle size={12} />
                          {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                        </>
                      )}
                    </span>
                    {currentPlan && (
                      <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {currentPlan.name}
                      </span>
                    )}
                  </div>
                </div>
                {currentPlan && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {formatPrice(currentPlan.price, subscription.plan_interval)}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      Billed {subscription.plan_interval === 'month' ? 'monthly' : 'annually'}
                    </div>
                  </div>
                )}
              </div>

              {subscription.cancel_at_period_end && (
                <div className="auth-error" style={{ marginBottom: 'var(--spacing-md)' }}>
                  <AlertCircle size={16} />
                  <span>
                    Your subscription will cancel on {subscription.current_period_end 
                      ? format(new Date(subscription.current_period_end), 'MMMM d, yyyy')
                      : 'the end of the billing period'}
                  </span>
                </div>
              )}

              {subscription.current_period_end && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 'var(--spacing-sm)',
                  padding: 'var(--spacing-md)',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem'
                }}>
                  <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {isActive ? 'Renews' : 'Expires'} on{' '}
                    <strong>{format(new Date(subscription.current_period_end), 'MMMM d, yyyy')}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Plan Features */}
            {currentPlan && (
              <div className="card">
                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Plan Features</h3>
                <ul className="pricing-features" style={{ margin: 0 }}>
                  {currentPlan.features.map((feature, index) => (
                    <li key={index} className="pricing-feature">
                      <CheckCircle size={16} style={{ color: 'var(--emerald-400)' }} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Billing Actions */}
            <div className="card">
              <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Billing & Management</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleManageBilling}
                >
                  <ExternalLink size={18} />
                  Manage Billing & Payment Methods
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={() => navigate('/pricing')}
                >
                  Change Plan
                  <ArrowRight size={18} />
                </button>
              </div>

              <div style={{ 
                marginTop: 'var(--spacing-lg)', 
                padding: 'var(--spacing-md)', 
                background: 'var(--bg-tertiary)', 
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                color: 'var(--text-muted)'
              }}>
                <strong>Note:</strong> Billing management requires backend setup. See <code>STRIPE_SETUP.md</code> for instructions.
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

