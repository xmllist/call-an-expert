import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

/**
 * Get the Stripe server-side instance.
 * Uses singleton pattern for efficiency.
 *
 * CRITICAL: This uses the secret key and must NEVER be imported in client components.
 * Only use in:
 * - API routes (app/api/*)
 * - Server Components
 * - Server Actions
 *
 * @returns Stripe instance
 * @throws Error if STRIPE_SECRET_KEY is not configured
 */
export function getStripeServer(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY

    if (!secretKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is not defined. ' +
        'Add it to your .env.local file. ' +
        'Get your key from https://dashboard.stripe.com/apikeys'
      )
    }

    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
      appInfo: {
        name: 'Call an Expert',
        version: '0.1.0',
      },
    })
  }

  return stripeInstance
}

/**
 * Create a new Stripe instance with custom configuration.
 * Useful for testing or when you need specific options.
 *
 * @param config - Optional Stripe configuration overrides
 * @returns New Stripe instance
 */
export function createStripeServer(config?: Stripe.StripeConfig): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY is not defined. ' +
      'Add it to your .env.local file. ' +
      'Get your key from https://dashboard.stripe.com/apikeys'
    )
  }

  return new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia',
    typescript: true,
    appInfo: {
      name: 'Call an Expert',
      version: '0.1.0',
    },
    ...config,
  })
}

/**
 * Verify a Stripe webhook signature.
 * Use this to validate incoming webhook requests.
 *
 * @param payload - Raw request body as string
 * @param signature - Stripe-Signature header value
 * @returns Parsed Stripe event
 * @throws Stripe.errors.StripeSignatureVerificationError if verification fails
 */
export function constructWebhookEvent(
  payload: string,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET is not defined. ' +
      'Add it to your .env.local file. ' +
      'Get your webhook secret from https://dashboard.stripe.com/webhooks'
    )
  }

  const stripe = getStripeServer()
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}

/**
 * Check if Stripe server configuration is complete.
 *
 * @returns Object indicating which keys are configured
 */
export function getStripeServerStatus(): {
  secretKeyConfigured: boolean
  webhookSecretConfigured: boolean
} {
  return {
    secretKeyConfigured: !!process.env.STRIPE_SECRET_KEY,
    webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
  }
}

/**
 * Platform fee percentage for session payments.
 * The platform takes 10% of each session payment.
 */
export const PLATFORM_FEE_PERCENT = 10

/**
 * Calculate platform fee and expert payout from a session amount.
 *
 * @param amountCents - Total session amount in cents
 * @returns Object with fee and payout amounts in cents
 */
export function calculateFees(amountCents: number): {
  platformFeeCents: number
  expertPayoutCents: number
} {
  const platformFeeCents = Math.round(amountCents * (PLATFORM_FEE_PERCENT / 100))
  const expertPayoutCents = amountCents - platformFeeCents

  return {
    platformFeeCents,
    expertPayoutCents,
  }
}

/**
 * Format amount in cents to display string.
 *
 * @param amountCents - Amount in cents
 * @param currency - Currency code (default: 'usd')
 * @returns Formatted string like "$15.00"
 */
export function formatAmount(amountCents: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100)
}
