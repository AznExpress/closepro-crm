// Stripe payment service
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Pricing plans
export const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    interval: 'month',
    description: 'Perfect for solo agents getting started',
    features: [
      'Up to 100 contacts',
      'Unlimited activities',
      'Deal pipeline tracking',
      'Email sync (1 account)',
      'Quick templates',
      'Reminders & follow-ups',
      'Lead source tracking'
    ],
    stripePriceId: import.meta.env.VITE_STRIPE_STARTER_PRICE_ID,
    popular: false
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    interval: 'month',
    description: 'For serious agents closing deals',
    features: [
      'Unlimited contacts',
      'Unlimited activities',
      'Deal pipeline tracking',
      'Email sync (unlimited)',
      'Quick templates',
      'Reminders & follow-ups',
      'Lead source analytics',
      'Priority support',
      'Data export'
    ],
    stripePriceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID,
    popular: true
  },
  {
    id: 'team',
    name: 'Team',
    price: 99,
    interval: 'month',
    description: 'For teams and brokerages',
    features: [
      'Everything in Pro',
      '3 team members',
      'Shared pipeline',
      'Team analytics',
      'Admin controls',
      'Priority support',
      'Custom onboarding'
    ],
    stripePriceId: import.meta.env.VITE_STRIPE_TEAM_PRICE_ID,
    popular: false
  }
];

// Initialize Stripe
export async function getStripe() {
  if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
    throw new Error('Stripe publishable key not configured');
  }
  return await stripePromise;
}

// Create checkout session (requires backend endpoint)
export async function createCheckoutSession(priceId, userId, userEmail) {
  // In production, this should call your backend API
  // For now, we'll use Stripe Checkout directly from frontend
  // Note: This requires a backend for production security
  
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      priceId,
      userId,
      userEmail,
      successUrl: `${window.location.origin}/subscription?success=true`,
      cancelUrl: `${window.location.origin}/pricing?canceled=true`
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create checkout session');
  }

  const { sessionId } = await response.json();
  return sessionId;
}

// Redirect to Stripe Checkout
export async function redirectToCheckout(priceId, userId, userEmail) {
  const stripe = await getStripe();
  
  try {
    const sessionId = await createCheckoutSession(priceId, userId, userEmail);
    await stripe.redirectToCheckout({ sessionId });
  } catch (error) {
    // If backend endpoint doesn't exist, show helpful error
    if (error.message.includes('Failed to create checkout session')) {
      throw new Error('Checkout requires backend setup. See STRIPE_SETUP.md for instructions.');
    }
    throw error;
  }
}

// Create customer portal session (for managing subscription)
export async function createPortalSession(customerId) {
  const response = await fetch('/api/create-portal-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customerId,
      returnUrl: `${window.location.origin}/subscription`
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create portal session');
  }

  const { url } = await response.json();
  return url;
}

// Check if user has active subscription
export function isSubscriptionActive(subscription) {
  if (!subscription) return false;
  return ['active', 'trialing'].includes(subscription.status);
}

// Get subscription limits based on plan
export function getPlanLimits(planName) {
  const plan = PLANS.find(p => p.id === planName);
  if (!plan) return { contacts: 0, emailAccounts: 0 };

  switch (plan.id) {
    case 'starter':
      return { contacts: 100, emailAccounts: 1 };
    case 'pro':
      return { contacts: -1, emailAccounts: -1 }; // -1 = unlimited
    case 'team':
      return { contacts: -1, emailAccounts: -1 };
    default:
      return { contacts: 0, emailAccounts: 0 };
  }
}

// Format price for display
export function formatPrice(price, interval = 'month') {
  return `$${price}/${interval === 'month' ? 'mo' : 'yr'}`;
}

