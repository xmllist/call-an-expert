import stripe, { calculatePlatformFee } from './client';
import { createServerSupabaseClient } from '~/lib/supabase';

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
  const supabase = createServerSupabaseClient();
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
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false
  };
}

export async function createLoginLink(accountId: string): Promise<string> {
  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink.url;
}
