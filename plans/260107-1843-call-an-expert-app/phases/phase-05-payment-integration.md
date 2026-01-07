---
title: "Phase 05: Payment Integration (Stripe Connect)"
description: "Stripe Connect Express accounts, payment flows, platform fees"
effort: 16h
phase: 05
parallel-group: B
dependencies: ["02"]  # Depends on Supabase schema
status: pending
---

# Phase 05: Payment Integration (Stripe Connect)

## Exclusive File Ownership

```
/integrations/
  /stripe/
    client.ts            # Stripe SDK initialization
    accounts.ts          # Connected account management
    payments.ts          # Payment intent creation
    webhooks.ts          # Stripe webhook handler
    payouts.ts           # Expert payout processing
  /web/app/
    /api/
      /stripe/
        connect/route.ts # Expert onboarding
        dashboard/route.ts # Stripe dashboard link
        webhook/route.ts   # Stripe webhooks
```

## Implementation Steps

### 5.1 Stripe Client Setup (stripe/client.ts)

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
export const PLATFORM_FEE_PERCENT = 10; // 10% commission

export default stripe;

// Helper to calculate platform fee
export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * (PLATFORM_FEE_PERCENT / 100));
}
```

### 5.2 Connected Account Management (stripe/accounts.ts)

```typescript
import stripe, { calculatePlatformFee } from './client';
import { supabase } from '~/lib/supabase';

interface CreateAccountParams {
  expertId: string;
  email: string;
  country?: string;
}

export async function createConnectedAccount({
  expertId,
  email,
  country = 'US'
}: CreateAccountParams): Promise<string> {
  // Create Stripe Express account
  const account = await stripe.accounts.create({
    type: 'express',
    country,
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    },
    business_type: 'individual',
    metadata: {
      expert_id: expertId,
      platform: 'call-an-expert'
    }
  });

  // Save account ID to expert profile
  await supabase
    .from('expert_profiles')
    .update({
      stripe_account_id: account.id,
      stripe_onboarded: false
    })
    .eq('id', expertId);

  return account.id;
}

export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<string> {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding'
  });

  return accountLink.url;
}

export async function getAccountStatus(accountId: string): Promise<{
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}> {
  const account = await stripe.accounts.retrieve(accountId);

  return {
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted
  };
}

export async function createLoginLink(accountId: string): Promise<string> {
  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink.url;
}
```

### 5.3 Payment Processing (stripe/payments.ts)

```typescript
import stripe, { calculatePlatformFee } from './client';
import { supabase } from '~/lib/supabase';

interface CreatePaymentParams {
  sessionId: string;
  userId: string;
  expertId: string;
  amount: number; // In cents
  currency?: string;
}

export async function createPaymentIntent({
  sessionId,
  userId,
  expertId,
  amount,
  currency = 'usd'
}: CreatePaymentParams): Promise<{
  clientSecret: string;
  paymentIntentId: string;
}> {
  // Get expert's Stripe account
  const { data: expert } = await supabase
    .from('expert_profiles')
    .select('stripe_account_id')
    .eq('id', expertId)
    .single();

  if (!expert?.stripe_account_id) {
    throw new Error('Expert has not set up payment account');
  }

  const platformFee = calculatePlatformFee(amount);

  // Create payment intent with automatic transfer
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    automatic_payment_methods: {
      enabled: true
    },
    application_fee_amount: platformFee,
    transfer_data: {
      destination: expert.stripe_account_id
    },
    metadata: {
      session_id: sessionId,
      user_id: userId,
      expert_id: expertId,
      platform: 'call-an-expert'
    }
  });

  // Record payment in database
  await supabase.from('payments').insert({
    session_id: sessionId,
    user_id: userId,
    expert_id: expertId,
    amount,
    platform_fee: platformFee,
    expert_amount: amount - platformFee,
    stripe_payment_intent_id: paymentIntent.id,
    status: 'pending'
  });

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id
  };
}

export async function refundPayment(
  paymentIntentId: string,
  reason?: string
): Promise<string> {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    reason: 'requested_by_customer',
    metadata: {
      reason: reason || 'Customer refund requested'
    }
  });

  return refund.id;
}

export async function getPaymentDetails(paymentIntentId: string) {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}
```

### 5.4 Stripe Webhook Handler (stripe/webhooks.ts)

```typescript
import stripe, { STRIPE_WEBHOOK_SECRET } from './client';
import { supabase } from '~/lib/supabase';
import type Stripe from 'stripe';

export async function handleStripeWebhook(
  body: string,
  signature: string
): Promise<{ received: boolean }> {
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;

    case 'account.updated':
      await handleAccountUpdated(event.data.object as Stripe.Account);
      break;

    case 'transfer.created':
      await handleTransferCreated(event.data.object as Stripe.Transfer);
      break;
  }

  return { received: true };
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { session_id, user_id, expert_id } = paymentIntent.metadata;

  // Update payment record
  await supabase
    .from('payments')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  // Update session status
  if (session_id) {
    await supabase
      .from('sessions')
      .update({ status: 'matched' })
      .eq('id', session_id);
  }

  // Send notification to user and expert
  // This could trigger an email or push notification
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { session_id } = paymentIntent.metadata;

  // Update payment record
  await supabase
    .from('payments')
    .update({
      status: 'failed'
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  // Update session status
  if (session_id) {
    await supabase
      .from('sessions')
      .update({ status: 'cancelled' })
      .eq('id', session_id);
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  const { expert_id } = account.metadata;

  if (!expert_id) return;

  const { charges_enabled, payouts_enabled, details_submitted } =
    await stripe.accounts.retrieve(account.id);

  await supabase
    .from('expert_profiles')
    .update({
      stripe_onboarded: charges_enabled && payouts_enabled && details_submitted
    })
    .eq('id', expert_id);
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  // Log transfer for accounting
  console.log(`Transfer created: ${transfer.id} to ${transfer.destination}`);
}
```

### 5.5 API Routes (web/app/api/stripe/...)

#### Connect Onboarding (connect/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createConnectedAccount, createAccountLink } from '~/integrations/stripe/accounts';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { expertId } = await req.json();

    // Get expert's email from profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', expertId)
      .single();

    if (!profile?.email) {
      return NextResponse.json(
        { error: 'Expert email not found' },
        { status: 400 }
      );
    }

    // Create or get Stripe account
    const { data: expert } = await supabaseAdmin
      .from('expert_profiles')
      .select('stripe_account_id')
      .eq('id', expertId)
      .single();

    let accountId = expert?.stripe_account_id;

    if (!accountId) {
      accountId = await createConnectedAccount({
        expertId,
        email: profile.email
      });
    }

    // Create onboarding link
    const onboardingUrl = await createAccountLink(
      accountId,
      `${process.env.NEXT_PUBLIC_APP_URL}/expert/onboarding/refresh`,
      `${process.env.NEXT_PUBLIC_APP_URL}/expert/onboarding/complete`
    );

    return NextResponse.json({ url: onboardingUrl });
  } catch (error) {
    console.error('Stripe connect error:', error);
    return NextResponse.json(
      { error: 'Failed to create onboarding link' },
      { status: 500 }
    );
  }
}
```

#### Stripe Webhook (webhook/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { handleStripeWebhook } from '~/integrations/stripe/webhooks';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  try {
    const result = await handleStripeWebhook(body, signature);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}
```

### 5.6 Frontend Payment Component

```tsx
// components/payment/PaymentModal.tsx
'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '~/lib/supabase';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentModalProps {
  sessionId: string;
  expertId: string;
  amount: number; // In cents
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PaymentModal({
  sessionId,
  expertId,
  amount,
  onSuccess,
  onCancel
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create payment intent
      const { data } = await supabase.functions.invoke('create-payment-intent', {
        body: { sessionId, expertId, amount }
      });

      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      // Redirect to Stripe Checkout (or use embedded form)
      const { error: stripeError } = await stripe.confirmPayment({
        clientSecret: data.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/session/${sessionId}/complete`
        }
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
      } else {
        onSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Complete Payment</h2>

        <div className="mb-6">
          <p className="text-gray-600">Session Fee</p>
          <p className="text-3xl font-bold">${(amount / 100).toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-1">
            10% platform fee included
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            className="flex-1 btn-primary"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Pay Now'}
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Secured by Stripe. Your payment info is encrypted.
        </p>
      </div>
    </div>
  );
}
```

### 5.7 Supabase Function for Payment Creation

```sql
CREATE OR REPLACE FUNCTION create_payment_intent(
  p_session_id UUID,
  p_user_id UUID,
  p_expert_id UUID,
  p_amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_intent_id TEXT;
  v_client_secret TEXT;
  v_platform_fee INTEGER;
  v_expert_account TEXT;
BEGIN
  -- Get expert's Stripe account
  SELECT stripe_account_id INTO v_expert_account
  FROM public.expert_profiles
  WHERE id = p_expert_id;

  IF v_expert_account IS NULL THEN
    RAISE EXCEPTION 'Expert has not set up payment account';
  END IF;

  -- Calculate platform fee (10%)
  v_platform_fee := ROUND(p_amount * 0.10);

  -- Call Stripe API (using net/http in production or Edge Function)
  -- This is a simplified representation
  PERFORM stripe_create_payment_intent(
    p_amount,
    'usd',
    v_expert_account,
    v_platform_fee,
    p_session_id::TEXT,
    p_user_id::TEXT,
    p_expert_id::TEXT
  );

  -- Return client secret (would come from Stripe API response)
  RETURN JSON_BUILD_OBJECT(
    'client_secret', 'pi_xxx_secret_xxx',
    'paymentIntentId', 'pi_xxx'
  );
END;
$$;
```

## Success Criteria

- [ ] Stripe Connect accounts created for experts
- [ ] Onboarding flow works end-to-end
- [ ] Payment intents created with platform fees
- [ ] Webhooks handle payment success/failure
- [ ] Refunds processed correctly
- [ ] No file overlap with other phases

## Conflict Prevention

- Stripe files under `/integrations/stripe/` exclusive
- Webhook routes in `/web/app/api/stripe/` don't conflict with Phase 03
- Database updates via Supabase only (Phase 02 schema)
