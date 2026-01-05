import { createClient } from '@/lib/supabase/server'
import { getStripeServer, calculateFees, formatAmount } from '@/lib/stripe/server'
import { NextResponse } from 'next/server'

/**
 * Payment Intent API Route
 *
 * Creates Stripe Payment Intents for session booking.
 * Uses the Payment Intents API (not deprecated Tokens/Sources).
 *
 * CRITICAL: This uses the Stripe secret key and must only run server-side.
 */

export interface CreatePaymentIntentBody {
  session_id: string
  amount?: number // Optional - will use session amount if not provided
}

export interface PaymentIntentResponse {
  clientSecret: string
  paymentIntentId: string
  amount: number
  formattedAmount: string
  platformFee: number
  expertPayout: number
  session: {
    id: string
    expert_id: string
    scheduled_at: string
    duration_minutes: number
  }
}

/**
 * POST /api/payment/create-intent
 * Create a Stripe Payment Intent for session booking
 *
 * Request body:
 * - session_id: string (required) - UUID of the session to pay for
 * - amount: number (optional) - Override amount in cents (uses session amount if not provided)
 *
 * Returns:
 * - 200: Payment Intent created successfully with client secret
 * - 400: Invalid request body or session state
 * - 401: Unauthorized - user not authenticated
 * - 404: Session not found
 * - 409: Session already paid or cancelled
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
        { error: 'Unauthorized', message: 'You must be logged in to make a payment' },
        { status: 401 }
      )
    }

    // Parse request body
    let body: CreatePaymentIntentBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    // Validate required fields
    const { session_id, amount: overrideAmount } = body

    if (!session_id || typeof session_id !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'session_id is required and must be a valid UUID' },
        { status: 400 }
      )
    }

    // Fetch the session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        id,
        user_id,
        expert_id,
        scheduled_at,
        duration_minutes,
        status,
        amount,
        platform_fee,
        expert_payout,
        payment_intent_id,
        expert:experts!sessions_expert_id_fkey (
          id,
          stripe_account_id,
          profiles:id (
            id,
            full_name,
            email
          )
        )
      `)
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Session not found' },
        { status: 404 }
      )
    }

    // Verify the user owns this session
    if (session.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to pay for this session' },
        { status: 403 }
      )
    }

    // Check session status - must be pending_payment or scheduled
    const validStatuses = ['pending_payment', 'scheduled']
    if (!validStatuses.includes(session.status)) {
      if (session.status === 'paid' || session.status === 'completed') {
        return NextResponse.json(
          { error: 'Conflict', message: 'This session has already been paid for' },
          { status: 409 }
        )
      }
      if (session.status === 'cancelled') {
        return NextResponse.json(
          { error: 'Conflict', message: 'This session has been cancelled' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Bad Request', message: `Cannot pay for session with status: ${session.status}` },
        { status: 400 }
      )
    }

    // If there's already a payment intent, return it instead of creating a new one
    if (session.payment_intent_id) {
      try {
        const stripe = getStripeServer()
        const existingIntent = await stripe.paymentIntents.retrieve(session.payment_intent_id)

        // If the existing intent is still valid (not cancelled or failed), return it
        if (['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing'].includes(existingIntent.status)) {
          return NextResponse.json({
            clientSecret: existingIntent.client_secret,
            paymentIntentId: existingIntent.id,
            amount: session.amount,
            formattedAmount: formatAmount(session.amount),
            platformFee: session.platform_fee,
            expertPayout: session.expert_payout,
            session: {
              id: session.id,
              expert_id: session.expert_id,
              scheduled_at: session.scheduled_at,
              duration_minutes: session.duration_minutes,
            },
          } as PaymentIntentResponse)
        }
      } catch {
        // If we can't retrieve the existing intent, create a new one
      }
    }

    // Use override amount or session amount
    const paymentAmount = overrideAmount && overrideAmount > 0 ? overrideAmount : session.amount

    if (paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Payment amount must be greater than zero' },
        { status: 400 }
      )
    }

    // Minimum amount for Stripe is $0.50 (50 cents)
    if (paymentAmount < 50) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Payment amount must be at least $0.50 (50 cents)' },
        { status: 400 }
      )
    }

    // Calculate fees
    const { platformFeeCents, expertPayoutCents } = calculateFees(paymentAmount)

    // Get expert info for description
    const expertName = (session.expert as { profiles?: { full_name?: string } })?.profiles?.full_name || 'Expert'

    // Get Stripe instance and create payment intent
    const stripe = getStripeServer()

    const paymentIntent = await stripe.paymentIntents.create({
      amount: paymentAmount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        sessionId: session.id,
        userId: user.id,
        expertId: session.expert_id,
        scheduledAt: session.scheduled_at,
        durationMinutes: session.duration_minutes.toString(),
        platformFee: platformFeeCents.toString(),
        expertPayout: expertPayoutCents.toString(),
      },
      description: `15-min expert session with ${expertName}`,
      statement_descriptor_suffix: 'EXPERT SESSION',
    })

    // Update session with payment intent ID
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        payment_intent_id: paymentIntent.id,
        amount: paymentAmount,
        platform_fee: platformFeeCents,
        expert_payout: expertPayoutCents,
      })
      .eq('id', session.id)

    if (updateError) {
      // Log the error but don't fail the request
      // The payment can still proceed and we'll update the session via webhook
      console.error('Failed to update session with payment intent ID:', updateError)
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentAmount,
      formattedAmount: formatAmount(paymentAmount),
      platformFee: platformFeeCents,
      expertPayout: expertPayoutCents,
      session: {
        id: session.id,
        expert_id: session.expert_id,
        scheduled_at: session.scheduled_at,
        duration_minutes: session.duration_minutes,
      },
    } as PaymentIntentResponse)
  } catch (error) {
    // Handle Stripe-specific errors
    if (error instanceof Error && error.message.includes('STRIPE_SECRET_KEY')) {
      return NextResponse.json(
        { error: 'Configuration Error', message: 'Payment system is not configured' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred while creating payment' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/payment/create-intent
 * Not supported - payment intents must be created via POST
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method Not Allowed', message: 'Use POST to create a payment intent' },
    { status: 405 }
  )
}
