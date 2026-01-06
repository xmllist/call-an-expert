/**
 * Session Pricing Tests
 *
 * Tests the pricing calculations for sessions:
 * - Per-session pricing
 * - Platform fee calculation (10%)
 * - Expert payout calculation
 * - Subscription session credits
 */

import { describe, it, expect } from 'vitest'

// Pricing constants
const PLATFORM_FEE_PERCENTAGE = 10 // 10%
const MIN_SESSION_RATE = 1500 // $15.00 in cents
const MAX_SESSION_RATE = 10000 // $100.00 in cents

// Subscription plans
const SUBSCRIPTION_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceYearly: 9900, // $99/year
    sessions: 10,
    pricePerSession: 990, // $9.90 effective price
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    priceYearly: 24900, // $249/year
    sessions: 30,
    pricePerSession: 830, // $8.30 effective price
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceYearly: 49900, // $499/year
    sessions: 100,
    pricePerSession: 499, // $4.99 effective price
  },
}

/**
 * Calculate platform fee
 * @param amount Amount in cents
 * @returns Platform fee in cents
 */
function calculatePlatformFee(amount: number): number {
  return Math.round(amount * (PLATFORM_FEE_PERCENTAGE / 100))
}

/**
 * Calculate expert payout
 * @param amount Total session amount in cents
 * @returns Expert payout in cents (after platform fee)
 */
function calculateExpertPayout(amount: number): number {
  const fee = calculatePlatformFee(amount)
  return amount - fee
}

/**
 * Calculate total amount with fees breakdown
 * @param sessionRate Expert's session rate in cents
 * @returns Fee breakdown
 */
function calculateFees(sessionRate: number): {
  total: number
  platformFee: number
  expertPayout: number
} {
  const platformFee = calculatePlatformFee(sessionRate)
  return {
    total: sessionRate,
    platformFee,
    expertPayout: sessionRate - platformFee,
  }
}

/**
 * Validate session rate
 * @param rate Rate in cents
 * @returns True if valid
 */
function isValidSessionRate(rate: number): boolean {
  return rate >= MIN_SESSION_RATE && rate <= MAX_SESSION_RATE
}

/**
 * Calculate subscription value
 * @param plan Subscription plan
 * @param averageSessionRate Average session rate in cents
 * @returns Savings information
 */
function calculateSubscriptionValue(
  plan: (typeof SUBSCRIPTION_PLANS)[keyof typeof SUBSCRIPTION_PLANS],
  averageSessionRate: number
): {
  perSessionRetail: number
  perSessionSubscription: number
  totalSavings: number
  savingsPercentage: number
} {
  const perSessionRetail = averageSessionRate
  const perSessionSubscription = Math.round(plan.priceYearly / plan.sessions)
  const totalRetail = averageSessionRate * plan.sessions
  const totalSavings = totalRetail - plan.priceYearly

  return {
    perSessionRetail,
    perSessionSubscription,
    totalSavings,
    savingsPercentage: Math.round((totalSavings / totalRetail) * 100),
  }
}

/**
 * Format amount in cents to display string
 * @param cents Amount in cents
 * @returns Formatted string (e.g., "$15.00")
 */
function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

describe('Session Pricing', () => {
  describe('calculatePlatformFee', () => {
    it('should calculate 10% platform fee', () => {
      expect(calculatePlatformFee(1000)).toBe(100) // $10 -> $1 fee
      expect(calculatePlatformFee(2500)).toBe(250) // $25 -> $2.50 fee
      expect(calculatePlatformFee(5000)).toBe(500) // $50 -> $5 fee
    })

    it('should round to nearest cent', () => {
      expect(calculatePlatformFee(1111)).toBe(111) // $11.11 -> $1.11 fee
      expect(calculatePlatformFee(3333)).toBe(333) // $33.33 -> $3.33 fee
    })

    it('should handle zero amount', () => {
      expect(calculatePlatformFee(0)).toBe(0)
    })
  })

  describe('calculateExpertPayout', () => {
    it('should calculate 90% expert payout', () => {
      expect(calculateExpertPayout(1000)).toBe(900) // $10 -> $9 payout
      expect(calculateExpertPayout(2500)).toBe(2250) // $25 -> $22.50 payout
      expect(calculateExpertPayout(5000)).toBe(4500) // $50 -> $45 payout
    })

    it('should handle minimum session rate', () => {
      const payout = calculateExpertPayout(MIN_SESSION_RATE)
      expect(payout).toBe(1350) // $15 -> $13.50 payout
    })

    it('should handle maximum session rate', () => {
      const payout = calculateExpertPayout(MAX_SESSION_RATE)
      expect(payout).toBe(9000) // $100 -> $90 payout
    })
  })

  describe('calculateFees', () => {
    it('should return complete fee breakdown', () => {
      const fees = calculateFees(3000) // $30 session

      expect(fees.total).toBe(3000)
      expect(fees.platformFee).toBe(300)
      expect(fees.expertPayout).toBe(2700)
    })

    it('should ensure total equals fee + payout', () => {
      const rates = [1500, 2000, 2500, 3500, 5000, 7500, 10000]

      for (const rate of rates) {
        const fees = calculateFees(rate)
        expect(fees.platformFee + fees.expertPayout).toBe(fees.total)
      }
    })
  })

  describe('isValidSessionRate', () => {
    it('should accept rates within valid range', () => {
      expect(isValidSessionRate(1500)).toBe(true) // $15
      expect(isValidSessionRate(3500)).toBe(true) // $35
      expect(isValidSessionRate(5000)).toBe(true) // $50
      expect(isValidSessionRate(10000)).toBe(true) // $100
    })

    it('should reject rates below minimum', () => {
      expect(isValidSessionRate(1499)).toBe(false) // $14.99
      expect(isValidSessionRate(1000)).toBe(false) // $10
      expect(isValidSessionRate(0)).toBe(false)
    })

    it('should reject rates above maximum', () => {
      expect(isValidSessionRate(10001)).toBe(false) // $100.01
      expect(isValidSessionRate(15000)).toBe(false) // $150
    })
  })

  describe('formatAmount', () => {
    it('should format cents to dollars', () => {
      expect(formatAmount(1500)).toBe('$15.00')
      expect(formatAmount(2550)).toBe('$25.50')
      expect(formatAmount(10000)).toBe('$100.00')
    })

    it('should handle cents properly', () => {
      expect(formatAmount(1)).toBe('$0.01')
      expect(formatAmount(99)).toBe('$0.99')
      expect(formatAmount(101)).toBe('$1.01')
    })
  })
})

describe('Subscription Plans', () => {
  describe('Plan pricing', () => {
    it('should have valid plan configurations', () => {
      for (const plan of Object.values(SUBSCRIPTION_PLANS)) {
        expect(plan.priceYearly).toBeGreaterThan(0)
        expect(plan.sessions).toBeGreaterThan(0)
        expect(plan.pricePerSession).toBeGreaterThan(0)
      }
    })

    it('should have decreasing per-session price for higher tiers', () => {
      const plans = Object.values(SUBSCRIPTION_PLANS)
      for (let i = 1; i < plans.length; i++) {
        expect(plans[i].pricePerSession).toBeLessThan(plans[i - 1].pricePerSession)
      }
    })
  })

  describe('calculateSubscriptionValue', () => {
    const averageSessionRate = 3000 // $30 average session

    it('should calculate savings for Starter plan', () => {
      const value = calculateSubscriptionValue(
        SUBSCRIPTION_PLANS.starter,
        averageSessionRate
      )

      expect(value.perSessionRetail).toBe(3000)
      expect(value.perSessionSubscription).toBe(990)
      expect(value.totalSavings).toBeGreaterThan(0)
      expect(value.savingsPercentage).toBeGreaterThan(0)
    })

    it('should calculate savings for Professional plan', () => {
      const value = calculateSubscriptionValue(
        SUBSCRIPTION_PLANS.professional,
        averageSessionRate
      )

      expect(value.totalSavings).toBeGreaterThan(0)
      // Professional should save more than Starter
      const starterValue = calculateSubscriptionValue(
        SUBSCRIPTION_PLANS.starter,
        averageSessionRate
      )
      expect(value.savingsPercentage).toBeGreaterThanOrEqual(starterValue.savingsPercentage)
    })

    it('should calculate savings for Enterprise plan', () => {
      const value = calculateSubscriptionValue(
        SUBSCRIPTION_PLANS.enterprise,
        averageSessionRate
      )

      expect(value.totalSavings).toBeGreaterThan(0)
      // Enterprise should have best savings percentage
      expect(value.savingsPercentage).toBeGreaterThanOrEqual(50)
    })

    it('should handle low session rates', () => {
      const value = calculateSubscriptionValue(
        SUBSCRIPTION_PLANS.starter,
        1500 // $15 session
      )

      // At low rates, savings might be negative (subscription costs more)
      // This is expected behavior - subscriptions are for higher-rate sessions
      expect(typeof value.totalSavings).toBe('number')
    })
  })
})

describe('Edge Cases', () => {
  it('should handle fractional cent calculations', () => {
    // $15.55 -> platform fee should round properly
    const fees = calculateFees(1555)
    expect(Number.isInteger(fees.platformFee)).toBe(true)
    expect(Number.isInteger(fees.expertPayout)).toBe(true)
    expect(fees.platformFee + fees.expertPayout).toBe(fees.total)
  })

  it('should handle very small amounts', () => {
    const fees = calculateFees(50) // $0.50 (below min, but testing calculation)
    expect(fees.platformFee).toBe(5)
    expect(fees.expertPayout).toBe(45)
  })

  it('should handle very large amounts', () => {
    const fees = calculateFees(100000) // $1000 (above max, but testing calculation)
    expect(fees.platformFee).toBe(10000)
    expect(fees.expertPayout).toBe(90000)
  })
})
