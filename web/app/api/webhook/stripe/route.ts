import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripeServer } from '@/lib/stripe/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Stripe Webhook Handler
 *
 * CRITICAL: This endpoint verifies webhook signatures to prevent spoofed requests.
 * Never process webhook events without signature verification.
 *
 * Handled events:
 * - payment_intent.succeeded: Updates session status to 'paid'
 * - payment_intent.payment_failed: Logs failed payment
 * - customer.subscription.created: Creates subscription record
 * - customer.subscription.updated: Updates subscription status
 * - customer.subscription.deleted: Marks subscription as canceled
 * - checkout.session.completed: Handles checkout completion
 *
 * Webhook secret is configured via STRIPE_WEBHOOK_SECRET environment variable.
 * Set up webhook in Stripe Dashboard: https://dashboard.stripe.com/webhooks
 */

/**
 * Create a Supabase admin client for webhook processing.
 * Uses the service role key to bypass RLS since webhooks don't have user context.
 *
 * CRITICAL: Only use this server-side in trusted webhook handlers.
 */
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined for webhook processing'
    )
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * POST /api/webhook/stripe
 * Handle incoming Stripe webhook events
 *
 * CRITICAL: Must use raw body text for signature verification.
 * Do NOT parse JSON before verification.
 */
export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  // Validate signature header exists
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  // Verify webhook signature
  // CRITICAL: Always verify signature to prevent spoofed requests
  let event: Stripe.Event
  try {
    const stripe = getStripeServer()
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    // Use constructEvent to verify the webhook signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Webhook signature verification failed', message: errorMessage },
      { status: 400 }
    )
  }

  // Get admin client for database operations
  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Database configuration error', message: errorMessage },
      { status: 500 }
    )
  }

  // Process the event based on type
  try {
    switch (event.type) {
      /**
       * Payment Intent Succeeded
       * Update session status to 'paid' when payment completes
       */
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const sessionId = paymentIntent.metadata?.sessionId

        if (!sessionId) {
          // Not a session payment, might be a different payment type
          break
        }

        const { error: updateError } = await supabase
          .from('sessions')
          .update({
            status: 'paid',
            payment_intent_id: paymentIntent.id,
          })
          .eq('id', sessionId)

        if (updateError) {
          // Log error but don't fail the webhook (Stripe would retry)
          // Better to acknowledge and investigate than cause retry loops
          return NextResponse.json(
            {
              error: 'Database error updating session',
              message: updateError.message,
              received: true, // Tell Stripe we got it
            },
            { status: 200 } // Still return 200 to acknowledge
          )
        }

        break
      }

      /**
       * Payment Intent Failed
       * Log failed payment for investigation
       */
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const sessionId = paymentIntent.metadata?.sessionId

        if (sessionId) {
          // Update session status to payment_failed
          // The failure details can be retrieved from Stripe if needed
          await supabase
            .from('sessions')
            .update({
              status: 'payment_failed',
            })
            .eq('id', sessionId)
        }

        break
      }

      /**
       * Subscription Created/Updated
       * Create or update subscription record in database
       */
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        if (!userId) {
          // Subscription without user ID - can't associate with a user
          break
        }

        // Get subscription details
        const priceId = subscription.items.data[0]?.price?.id
        const status = subscription.status
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()
        const currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString()

        // Calculate sessions remaining based on plan
        // This is a simplified calculation - adjust based on your pricing tiers
        let sessionsRemaining: number | null = null
        if (subscription.items.data[0]?.price?.metadata?.sessions_included) {
          sessionsRemaining = parseInt(
            subscription.items.data[0].price.metadata.sessions_included,
            10
          )
        }

        // Upsert subscription record
        const { error: upsertError } = await supabase
          .from('subscriptions')
          .upsert(
            {
              user_id: userId,
              stripe_subscription_id: subscription.id,
              plan: priceId || 'unknown',
              status: status,
              sessions_remaining: sessionsRemaining,
              current_period_start: currentPeriodStart,
              current_period_end: currentPeriodEnd,
            },
            {
              onConflict: 'stripe_subscription_id',
            }
          )

        if (upsertError) {
          return NextResponse.json(
            {
              error: 'Database error upserting subscription',
              message: upsertError.message,
              received: true,
            },
            { status: 200 }
          )
        }

        break
      }

      /**
       * Subscription Deleted (Cancelled)
       * Mark subscription as canceled in database
       */
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
          })
          .eq('stripe_subscription_id', subscription.id)

        if (updateError) {
          return NextResponse.json(
            {
              error: 'Database error updating subscription status',
              message: updateError.message,
              received: true,
            },
            { status: 200 }
          )
        }

        break
      }

      /**
       * Checkout Session Completed
       * Handle successful checkout (for subscription or one-time payments)
       */
      case 'checkout.session.completed': {
        const checkoutSession = event.data.object as Stripe.Checkout.Session

        // For subscription checkouts, the subscription events will handle the DB update
        // This is primarily for logging/analytics

        // For session bookings via Checkout (if we add that flow later)
        if (checkoutSession.mode === 'payment' && checkoutSession.metadata?.sessionId) {
          const sessionId = checkoutSession.metadata.sessionId

          await supabase
            .from('sessions')
            .update({
              status: 'paid',
              payment_intent_id:
                typeof checkoutSession.payment_intent === 'string'
                  ? checkoutSession.payment_intent
                  : checkoutSession.payment_intent?.id || null,
            })
            .eq('id', sessionId)
        }

        break
      }

      /**
       * Charge Refunded
       * Handle refunds for session payments
       */
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const paymentIntentId = charge.payment_intent

        if (typeof paymentIntentId !== 'string') {
          break
        }

        // Find the session with this payment intent and mark as refunded
        const { data: session, error: fetchError } = await supabase
          .from('sessions')
          .select('id')
          .eq('payment_intent_id', paymentIntentId)
          .single()

        if (session && !fetchError) {
          await supabase
            .from('sessions')
            .update({
              status: 'refunded',
            })
            .eq('id', session.id)
        }

        break
      }

      /**
       * Account Updated (for Stripe Connect)
       * Update expert's Stripe account status
       */
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        const expertId = account.metadata?.expertId

        if (!expertId) {
          break
        }

        // Update expert's Stripe account ID if not set
        const { data: expert } = await supabase
          .from('experts')
          .select('stripe_account_id')
          .eq('id', expertId)
          .single()

        if (expert && !expert.stripe_account_id) {
          await supabase
            .from('experts')
            .update({
              stripe_account_id: account.id,
            })
            .eq('id', expertId)
        }

        break
      }

      /**
       * Default case - unhandled event types
       * Log for monitoring but acknowledge receipt
       */
      default:
        // Unhandled event type - acknowledge receipt but don't process
        break
    }

    // Acknowledge receipt of the event
    return NextResponse.json(
      { received: true, type: event.type },
      { status: 200 }
    )
  } catch (error) {
    // Catch-all for unexpected errors during event processing
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Still return 200 to acknowledge receipt and prevent retry loops
    // Log the error for investigation
    return NextResponse.json(
      {
        error: 'Error processing webhook event',
        message: errorMessage,
        type: event.type,
        received: true,
      },
      { status: 200 }
    )
  }
}

/**
 * GET /api/webhook/stripe
 * Not supported - webhooks must be POST requests from Stripe
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method Not Allowed', message: 'This endpoint only accepts POST requests from Stripe' },
    { status: 405 }
  )
}
