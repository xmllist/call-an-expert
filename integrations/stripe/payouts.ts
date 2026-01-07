import stripe from './client';
import { createServerSupabaseClient } from '~/lib/supabase';

export interface PayoutSummary {
  expertId: string;
  totalEarnings: number;
  platformFee: number;
  netAmount: number;
  payoutStatus: 'pending' | 'processing' | 'completed';
  lastPayoutDate: string | null;
}

/**
 * Get payout summary for an expert
 */
export async function getExpertPayoutSummary(expertId: string): Promise<PayoutSummary> {
  const supabase = createServerSupabaseClient();

  // Get all completed payments for this expert
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, platform_fee, status')
    .eq('expert_id', expertId)
    .eq('status', 'completed');

  const totalEarnings = payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const platformFee = payments?.reduce((sum, p) => sum + p.platform_fee, 0) ?? 0;
  const netAmount = totalEarnings - platformFee;

  // Get last payout info
  const { data: payouts } = await supabase
    .from('payouts')
    .select('created_at, status')
    .eq('expert_id', expertId)
    .order('created_at', { ascending: false })
    .limit(1);

  return {
    expertId,
    totalEarnings,
    platformFee,
    netAmount,
    payoutStatus: payouts?.[0]?.status === 'processing' ? 'processing' : 'pending',
    lastPayoutDate: payouts?.[0]?.created_at ?? null
  };
}

/**
 * Create a manual payout to an expert's connected account
 */
export async function createPayout(
  expertId: string,
  amount: number,
  description?: string
): Promise<{ payoutId: string; status: string }> {
  const supabase = createServerSupabaseClient();

  // Get expert's Stripe account
  const { data: expert } = await supabase
    .from('expert_profiles')
    .select('stripe_account_id')
    .eq('id', expertId)
    .single();

  if (!expert?.stripe_account_id) {
    throw new Error('Expert has not set up Stripe account');
  }

  // Create payout
  const payout = await stripe.payouts.create({
    amount,
    currency: 'usd',
    description: description || `Payout for expert ${expertId}`,
    metadata: {
      expert_id: expertId,
      platform: 'call-an-expert'
    }
  }, {
    stripeAccount: expert.stripe_account_id
  });

  // Record payout in database
  await supabase.from('payouts').insert({
    expert_id: expertId,
    stripe_payout_id: payout.id,
    amount,
    status: payout.status,
    created_at: new Date().toISOString()
  });

  return {
    payoutId: payout.id,
    status: payout.status
  };
}

/**
 * Get payout status from Stripe
 */
export async function getPayoutStatus(payoutId: string, stripeAccountId: string) {
  return stripe.payouts.retrieve(payoutId, {
    stripeAccount: stripeAccountId
  });
}
