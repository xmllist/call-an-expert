import stripe, { STRIPE_WEBHOOK_SECRET } from './client';
import { createServerSupabaseClient } from '~/lib/supabase';
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

  const supabase = createServerSupabaseClient();

  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(supabase, event.data.object as Stripe.PaymentIntent);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentFailed(supabase, event.data.object as Stripe.PaymentIntent);
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

async function handlePaymentSucceeded(supabase: any, paymentIntent: Stripe.PaymentIntent) {
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

async function handlePaymentFailed(supabase: any, paymentIntent: Stripe.PaymentIntent) {
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

  const accountDetails = await stripe.accounts.retrieve(account.id);

  const supabase = createServerSupabaseClient();
  await supabase
    .from('expert_profiles')
    .update({
      stripe_onboarded: (accountDetails.charges_enabled ?? false) && 
                       (accountDetails.payouts_enabled ?? false) && 
                       (accountDetails.details_submitted ?? false)
    })
    .eq('id', expert_id);
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  // Log transfer for accounting
  console.log(`Transfer created: ${transfer.id} to ${transfer.destination}`);
}
