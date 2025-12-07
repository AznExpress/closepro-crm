import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, 
  ArrowRight, 
  Sparkles,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { PLANS, formatPrice, redirectToCheckout } from '../services/stripeService';

export default function Pricing() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');

  const handleSelectPlan = async (plan) => {
    if (!isAuthenticated) {
      navigate('/signup', { state: { plan: plan.id } });
      return;
    }

    setLoading(plan.id);
    setError('');

    try {
      if (!plan.stripePriceId) {
        throw new Error('Plan price ID not configured. Add Stripe price IDs to .env');
      }
      
      await redirectToCheckout(plan.stripePriceId, user.id, user.email);
      // User will be redirected to Stripe Checkout
    } catch (err) {
      setError(err.message || 'Failed to start checkout');
      setLoading(null);
    }
  };

  return (
    <>
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Pricing</h1>
            <p className="page-subtitle">
              Choose the plan that fits your business. All plans include a 14-day free trial.
            </p>
          </div>
        </div>
      </header>

      <div className="page-content">
        {error && (
          <div className="auth-error" style={{ marginBottom: 'var(--spacing-xl)' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="pricing-grid">
          {PLANS.map((plan) => (
            <div 
              key={plan.id} 
              className={`pricing-card ${plan.popular ? 'popular' : ''} animate-slide-up`}
              style={{ animationDelay: `${PLANS.indexOf(plan) * 100}ms` }}
            >
              {plan.popular && (
                <div className="pricing-badge">
                  <Sparkles size={14} />
                  Most Popular
                </div>
              )}

              <div className="pricing-header">
                <h3 className="pricing-name">{plan.name}</h3>
                <div className="pricing-price">
                  <span className="pricing-amount">${plan.price}</span>
                  <span className="pricing-interval">/{plan.interval === 'month' ? 'mo' : 'yr'}</span>
                </div>
                <p className="pricing-description">{plan.description}</p>
              </div>

              <ul className="pricing-features">
                {plan.features.map((feature, index) => (
                  <li key={index} className="pricing-feature">
                    <Check size={16} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`btn btn-lg ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleSelectPlan(plan)}
                disabled={loading === plan.id}
                style={{ width: '100%', marginTop: 'auto' }}
              >
                {loading === plan.id ? (
                  'Processing...'
                ) : (
                  <>
                    {isAuthenticated ? 'Upgrade' : 'Start Free Trial'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="pricing-faq" style={{ marginTop: 'var(--spacing-2xl)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-xl)', textAlign: 'center' }}>Frequently Asked Questions</h2>
          
          <div className="faq-grid">
            <div className="faq-item">
              <h4>Do you offer a free trial?</h4>
              <p>Yes! All plans include a 14-day free trial. No credit card required to start.</p>
            </div>
            
            <div className="faq-item">
              <h4>Can I change plans later?</h4>
              <p>Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>
            
            <div className="faq-item">
              <h4>What payment methods do you accept?</h4>
              <p>We accept all major credit cards and debit cards through Stripe's secure payment processing.</p>
            </div>
            
            <div className="faq-item">
              <h4>Is my data safe?</h4>
              <p>Yes. We use industry-standard encryption and your data is stored securely in Supabase with row-level security.</p>
            </div>
            
            <div className="faq-item">
              <h4>Can I cancel anytime?</h4>
              <p>Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.</p>
            </div>
            
            <div className="faq-item">
              <h4>Do you offer refunds?</h4>
              <p>We offer a 30-day money-back guarantee. If you're not satisfied, contact us for a full refund.</p>
            </div>
          </div>
        </div>

        {/* Setup Notice */}
        {!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY && (
          <div className="card" style={{ marginTop: 'var(--spacing-xl)', background: 'rgba(245, 158, 11, 0.1)', borderColor: 'var(--amber-500)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
              <AlertCircle size={18} style={{ color: 'var(--amber-400)' }} />
              <strong>Stripe Not Configured</strong>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
              Add your Stripe publishable key to enable payments. See <code>STRIPE_SETUP.md</code> for setup instructions.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

