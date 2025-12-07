# Stripe Payments Setup Guide

This guide will help you set up Stripe payments for ClosePro CRM.

## Overview

ClosePro uses Stripe for subscription payments. The integration includes:
- **Stripe Checkout** - Hosted payment page
- **Customer Portal** - Self-service subscription management
- **Webhooks** - Real-time subscription updates

## Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete account verification
3. Get your API keys from Dashboard → Developers → API keys

## Step 2: Create Products & Prices

### In Stripe Dashboard:

1. **Go to Products** → Create product
2. **Create 3 products:**

#### Starter Plan
- Name: "Starter"
- Description: "Perfect for solo agents getting started"
- Pricing: $29/month (recurring)
- Copy the **Price ID** (starts with `price_...`)

#### Pro Plan
- Name: "Pro"
- Description: "For serious agents closing deals"
- Pricing: $49/month (recurring)
- Copy the **Price ID**

#### Team Plan
- Name: "Team"
- Description: "For teams and brokerages"
- Pricing: $99/month (recurring)
- Copy the **Price ID**

## Step 3: Configure Environment Variables

Add to your `.env` file:

```env
# Stripe Keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_... for production)
VITE_STRIPE_SECRET_KEY=sk_test_... (for backend only, NOT in .env)
VITE_STRIPE_STARTER_PRICE_ID=price_...
VITE_STRIPE_PRO_PRICE_ID=price_...
VITE_STRIPE_TEAM_PRICE_ID=price_...
```

⚠️ **Important**: Never commit `VITE_STRIPE_SECRET_KEY` to your frontend. It should only be used in backend code.

## Step 4: Backend API Endpoints

You need to create backend endpoints for secure payment processing. Here are the endpoints needed:

### Option 1: Supabase Edge Functions (Recommended)

Create Edge Functions in your Supabase project:

#### `/functions/create-checkout-session/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  try {
    const { priceId, userId, userEmail, successUrl, cancelUrl } = await req.json()

    const session = await stripe.checkout.sessions.create({
      customer_email: userEmail,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
      },
    })

    return new Response(
      JSON.stringify({ sessionId: session.id }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

#### `/functions/create-portal-session/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  try {
    const { customerId, returnUrl } = await req.json()

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

#### `/functions/stripe-webhook/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  const body = await req.text()
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // Handle different event types
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session
      await handleCheckoutCompleted(session)
      break

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription
      await handleSubscriptionUpdate(subscription)
      break

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  if (!userId) return

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  )

  await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    stripe_price_id: subscription.items.data[0].price.id,
    status: subscription.status,
    plan_name: getPlanNameFromPriceId(subscription.items.data[0].price.id),
    plan_price: subscription.items.data[0].price.unit_amount! / 100,
    plan_interval: subscription.items.data[0].price.recurring?.interval || 'month',
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
  })
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at 
        ? new Date(subscription.canceled_at * 1000).toISOString() 
        : null,
    })
    .eq('stripe_subscription_id', subscription.id)
}

function getPlanNameFromPriceId(priceId: string): string {
  // Map your price IDs to plan names
  const starterPriceId = Deno.env.get('STRIPE_STARTER_PRICE_ID') || ''
  const proPriceId = Deno.env.get('STRIPE_PRO_PRICE_ID') || ''
  const teamPriceId = Deno.env.get('STRIPE_TEAM_PRICE_ID') || ''

  if (priceId === starterPriceId) return 'starter'
  if (priceId === proPriceId) return 'pro'
  if (priceId === teamPriceId) return 'team'
  return 'starter'
}
```

### Option 2: Node.js/Express Backend

If you prefer a traditional backend:

```javascript
// routes/stripe.js
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

router.post('/create-checkout-session', async (req, res) => {
  const { priceId, userId, userEmail, successUrl, cancelUrl } = req.body;

  const session = await stripe.checkout.sessions.create({
    customer_email: userEmail,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId },
  });

  res.json({ sessionId: session.id });
});

router.post('/create-portal-session', async (req, res) => {
  const { customerId, returnUrl } = req.body;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  res.json({ url: session.url });
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle events (similar to Edge Function above)
  // ...

  res.json({ received: true });
});

module.exports = router;
```

## Step 5: Configure Webhooks

1. **In Stripe Dashboard** → Developers → Webhooks
2. **Add endpoint:**
   - URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`
   - Events to send:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
3. **Copy webhook signing secret** → Add to Supabase secrets:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Step 6: Update Frontend Service

Update `src/services/stripeService.js` to use your backend:

```javascript
// Replace createCheckoutSession function
export async function createCheckoutSession(priceId, userId, userEmail) {
  const response = await fetch('https://your-project.supabase.co/functions/v1/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}` // If using Supabase Edge Functions
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
  const stripe = await getStripe();
  await stripe.redirectToCheckout({ sessionId });
}
```

## Step 7: Test

### Test Mode
1. Use test API keys (`pk_test_...`)
2. Use test card: `4242 4242 4242 4242`
3. Any future expiry date, any CVC
4. Test webhook events in Stripe Dashboard

### Production
1. Switch to live keys (`pk_live_...`)
2. Update webhook endpoint to production URL
3. Test with real card (use small amount first)

## Security Checklist

- [ ] Never expose `STRIPE_SECRET_KEY` in frontend code
- [ ] Use HTTPS for all webhook endpoints
- [ ] Verify webhook signatures
- [ ] Use environment variables for all secrets
- [ ] Enable Stripe's fraud detection
- [ ] Set up email notifications for failed payments

## Troubleshooting

### "Checkout requires backend endpoint"
- Make sure you've created the backend API endpoint
- Check that the URL is correct in `stripeService.js`
- Verify CORS is configured correctly

### "Webhook not receiving events"
- Check webhook URL is accessible
- Verify webhook secret is correct
- Check Stripe Dashboard → Webhooks → Recent events

### "Subscription not updating in database"
- Check webhook handler is processing events
- Verify database permissions
- Check Supabase logs for errors

## Next Steps

1. Set up Edge Functions or backend API
2. Configure webhooks
3. Test checkout flow
4. Test subscription management
5. Deploy to production

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

