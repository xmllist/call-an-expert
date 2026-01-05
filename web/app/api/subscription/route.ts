import { createClient } from '@/lib/supabase/server'
import { getStripeServer, formatAmount } from '@/lib/stripe/server'
import { NextResponse } from 'next/server'

/**
 * Subscription API Route
 *
 * Handles Stripe subscription management for agency plans.
 * Plans: starter ($99/year), professional ($249/year), enterprise ($499/year)
 *
 * CRITICAL: This uses the Stripe secret key and must only run server-side.
 */

// Subscription plan definitions
export const SUBSCRIPTION_PLANS = {
  starter: {
    name: 'Starter',
    price: 9900, // cents - $99/year
    priceMonthly: 825, // ~$8.25/month
    sessionsIncluded: 10,
    features: [
      '10 expert sessions per year',
      'Priority matching',
      'Session history & notes',
      'Email support',
    ],
  },
  professional: {
    name: 'Professional',
    price: 24900, // cents - $249/year
    priceMonthly: 2075, // ~$20.75/month
    sessionsIncluded: 30,
    features: [
      '30 expert sessions per year',
      'Priority matching',
      'Session history & notes',
      'Dedicated account manager',
      'Priority support',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 49900, // cents - $499/year
    priceMonthly: 4158, // ~$41.58/month
    sessionsIncluded: 100,
    features: [
      '100 expert sessions per year',
      'Priority matching',
      'Session history & notes',
      'Dedicated account manager',
      'Team management',
      '24/7 priority support',
      'Custom integrations',
    ],
  },
} as const

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLANS

export interface CreateSubscriptionBody {
  plan: SubscriptionPlanKey
  success_url?: string
  cancel_url?: string
}

export interface SubscriptionResponse {
  id: string
  user_id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  plan: string
  status: string
  sessions_included: number
  sessions_remaining: number
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
}

/**
 * GET /api/subscription
 * Get user's current subscription(s)
 *
 * Query params:
 * - status: Filter by status (optional)
 *
 * Returns:
 * - 200: List of subscriptions
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to view subscriptions' },
        { status: 401 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Build query
    let query = supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: subscriptions, error: fetchError } = await query

    if (fetchError) {
      return NextResponse.json(
        { error: 'Database Error', message: fetchError.message },
        { status: 500 }
      )
    }

    // Add plan details to each subscription
    const subscriptionsWithDetails = subscriptions.map((sub) => {
      const planKey = sub.plan as SubscriptionPlanKey
      const planDetails = SUBSCRIPTION_PLANS[planKey]
      return {
        ...sub,
        plan_details: planDetails || null,
      }
    })

    return NextResponse.json({
      subscriptions: subscriptionsWithDetails,
      plans: SUBSCRIPTION_PLANS,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/subscription
 * Create a Stripe Checkout session for subscription
 *
 * Request body:
 * - plan: 'starter' | 'professional' | 'enterprise' (required)
 * - success_url: URL to redirect to on success (optional)
 * - cancel_url: URL to redirect to on cancel (optional)
 *
 * Returns:
 * - 200: Checkout session URL
 * - 400: Invalid plan
 * - 401: Unauthorized
 * - 409: Already has active subscription
 * - 500: Server error
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to subscribe' },
        { status: 401 }
      )
    }

    // Parse request body
    let body: CreateSubscriptionBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    // Validate plan
    const { plan, success_url, cancel_url } = body

    if (!plan || !SUBSCRIPTION_PLANS[plan]) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: `Invalid plan. Must be one of: ${Object.keys(SUBSCRIPTION_PLANS).join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Check for existing active subscription
    const { data: existingSubscriptions, error: checkError } = await supabase
      .from('subscriptions')
      .select('id, plan, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])

    if (checkError) {
      return NextResponse.json(
        { error: 'Database Error', message: checkError.message },
        { status: 500 }
      )
    }

    if (existingSubscriptions && existingSubscriptions.length > 0) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: 'You already have an active subscription. Please manage it from your dashboard.',
          subscription: existingSubscriptions[0],
        },
        { status: 409 }
      )
    }

    // Get user profile for customer creation
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    // Get or create Stripe customer
    const stripe = getStripeServer()

    // Look for existing customer by email
    const existingCustomers = await stripe.customers.list({
      email: profile?.email || user.email,
      limit: 1,
    })

    let customerId: string
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id
    } else {
      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        name: profile?.full_name || undefined,
        metadata: {
          userId: user.id,
        },
      })
      customerId = customer.id
    }

    // Get plan details
    const planDetails = SUBSCRIPTION_PLANS[plan]

    // Create Stripe Checkout session
    // NOTE: In production, you should create Products/Prices in Stripe Dashboard
    // and reference them by ID. For MVP, we create inline prices.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Call an Expert - ${planDetails.name} Plan`,
              description: `${planDetails.sessionsIncluded} expert sessions per year`,
              metadata: {
                plan: plan,
                sessions_included: planDetails.sessionsIncluded.toString(),
              },
            },
            unit_amount: planDetails.price,
            recurring: {
              interval: 'year',
              interval_count: 1,
            },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          userId: user.id,
          plan: plan,
          sessionsIncluded: planDetails.sessionsIncluded.toString(),
        },
      },
      success_url: success_url || `${baseUrl}/dashboard?subscription=success`,
      cancel_url: cancel_url || `${baseUrl}/pricing?subscription=canceled`,
      metadata: {
        userId: user.id,
        plan: plan,
      },
    })

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      plan: plan,
      planDetails: {
        name: planDetails.name,
        price: planDetails.price,
        formattedPrice: formatAmount(planDetails.price),
        sessionsIncluded: planDetails.sessionsIncluded,
      },
    })
  } catch (error) {
    // Handle Stripe-specific errors
    if (error instanceof Error && error.message.includes('STRIPE_SECRET_KEY')) {
      return NextResponse.json(
        { error: 'Configuration Error', message: 'Payment system is not configured' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred while creating subscription' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/subscription
 * Cancel subscription at period end
 *
 * Query params:
 * - subscription_id: Stripe subscription ID (required)
 *
 * Returns:
 * - 200: Subscription will be canceled at period end
 * - 400: Missing subscription_id
 * - 401: Unauthorized
 * - 403: Not subscription owner
 * - 404: Subscription not found
 * - 500: Server error
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to cancel a subscription' },
        { status: 401 }
      )
    }

    // Get subscription_id from query params
    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get('subscription_id')

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'subscription_id is required' },
        { status: 400 }
      )
    }

    // Fetch subscription from database to verify ownership
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Subscription not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (subscription.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not own this subscription' },
        { status: 403 }
      )
    }

    // Check if already canceled
    if (subscription.status === 'canceled') {
      return NextResponse.json(
        { error: 'Conflict', message: 'Subscription is already canceled' },
        { status: 409 }
      )
    }

    // Cancel subscription at period end via Stripe
    const stripe = getStripeServer()

    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })

    // Update local database
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
      })
      .eq('stripe_subscription_id', subscriptionId)

    if (updateError) {
      // Log but don't fail - Stripe is the source of truth
    }

    return NextResponse.json({
      message: 'Subscription will be canceled at the end of the billing period',
      subscription: {
        id: subscription.id,
        stripe_subscription_id: subscriptionId,
        cancel_at_period_end: true,
        current_period_end: subscription.current_period_end,
        status: updatedSubscription.status,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred while canceling subscription' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/subscription
 * Reactivate a subscription that was set to cancel at period end
 *
 * Request body:
 * - subscription_id: Stripe subscription ID (required)
 *
 * Returns:
 * - 200: Subscription reactivated
 * - 400: Missing subscription_id
 * - 401: Unauthorized
 * - 403: Not subscription owner
 * - 404: Subscription not found
 * - 409: Cannot reactivate (already canceled or active)
 * - 500: Server error
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to reactivate a subscription' },
        { status: 401 }
      )
    }

    // Parse request body
    let body: { subscription_id: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { subscription_id: subscriptionId } = body

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'subscription_id is required' },
        { status: 400 }
      )
    }

    // Fetch subscription from database to verify ownership
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Subscription not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (subscription.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not own this subscription' },
        { status: 403 }
      )
    }

    // Check if can be reactivated
    if (subscription.status === 'canceled') {
      return NextResponse.json(
        { error: 'Conflict', message: 'Cannot reactivate a fully canceled subscription. Please create a new subscription.' },
        { status: 409 }
      )
    }

    if (!subscription.cancel_at_period_end) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Subscription is already active and not scheduled for cancellation' },
        { status: 409 }
      )
    }

    // Reactivate subscription via Stripe
    const stripe = getStripeServer()

    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    })

    // Update local database
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: false,
      })
      .eq('stripe_subscription_id', subscriptionId)

    if (updateError) {
      // Log but don't fail - Stripe is the source of truth
    }

    return NextResponse.json({
      message: 'Subscription has been reactivated',
      subscription: {
        id: subscription.id,
        stripe_subscription_id: subscriptionId,
        cancel_at_period_end: false,
        status: updatedSubscription.status,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred while reactivating subscription' },
      { status: 500 }
    )
  }
}
