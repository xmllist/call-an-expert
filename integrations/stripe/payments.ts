import stripe, { calculatePlatformFee } from './client';
import { createServerSupabaseClient } from '~/lib/supabase';

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
  const supabase = createServerSupabaseClient();

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
    clientSecret: paymentIntent.client_secret ?? '',
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
