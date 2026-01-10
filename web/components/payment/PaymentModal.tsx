'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '~/lib/supabase';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '');

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
      const { data, error: funcError } = await supabase.functions.invoke('create-payment-intent', {
        body: { sessionId, expertId, amount }
      });

      if (funcError) {
        throw new Error(funcError.message);
      }

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Complete Payment</h2>

        <div className="mb-6">
          <p className="text-gray-600">Session Fee</p>
          <p className="text-3xl font-bold text-gray-900">${(amount / 100).toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-1">
            10% platform fee included
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
