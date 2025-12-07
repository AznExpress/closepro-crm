import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { isSubscriptionActive, getPlanLimits } from '../services/stripeService';

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadSubscription();
    } else {
      setSubscription(null);
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const loadSubscription = async () => {
    if (!isSupabaseConfigured() || !user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading subscription:', error);
      }

      setSubscription(data || null);
    } catch (err) {
      console.error('Subscription load error:', err);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    subscription,
    loading,
    isActive: isSubscriptionActive(subscription),
    planName: subscription?.plan_name || null,
    limits: getPlanLimits(subscription?.plan_name),
    refresh: loadSubscription
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    // Return default values if not in provider (for demo mode)
    return {
      subscription: null,
      loading: false,
      isActive: true, // Allow access in demo mode
      planName: null,
      limits: { contacts: -1, emailAccounts: -1 }, // Unlimited in demo
      refresh: () => {}
    };
  }
  return context;
}

