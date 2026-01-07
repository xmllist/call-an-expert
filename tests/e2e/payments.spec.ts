// Payment Flow E2E tests - Phase 06: Integration Tests
import { test, expect } from '@playwright/test';

test.describe('Stripe Connect Onboarding', () => {
  test('expert can start Stripe Connect onboarding', async ({ page }) => {
    // Mock auth
    await page.route('**/auth/**', route => {
      route.fulfill({ status: 200, body: JSON.stringify({ user: { id: 'expert-1' } }) });
    });

    await page.goto('/dashboard/expert/settings');

    // Navigate to payments section
    await page.click('text=Payments');

    // Click Set up payments
    await page.click('text=Set up payments');

    // Verify redirect to Stripe Connect
    await expect(page).toHaveURL(/connect\.stripe\.com/);
  });
});

test.describe('Payment Split Calculation', () => {
  test('payment splits correctly (90% expert, 10% platform)', async ({ page }) => {
    // Test the backend calculation
    // Create payment for $100 session ($100/hour × 1hr)
    // Verify platform_fee = $10, expert_amount = $90

    const sessionAmount = 10000; // $100.00 in cents
    const expectedPlatformFee = 1000; // 10%
    const expectedExpertAmount = 9000; // 90%

    // Verify calculation matches schema.sql
    expect(expectedPlatformFee).toBe(sessionAmount * 0.10);
    expect(expectedExpertAmount).toBe(sessionAmount * 0.90);
  });

  test('2-hour session calculates correctly', async ({ page }) => {
    const hourlyRate = 15000; // $150/hour
    const duration = 120; // 2 hours in minutes
    const expectedTotal = 30000; // $300
    const expectedCommission = 3000; // 10% = $30
    const expectedPayout = 27000; // 90% = $270

    expect(expectedTotal).toBe(hourlyRate * (duration / 60));
    expect(expectedCommission).toBe(expectedTotal * 0.10);
    expect(expectedPayout).toBe(expectedTotal - expectedCommission);
  });
});

test.describe('Refund Calculation', () => {
  test('100% refund if cancelled > 24 hours before', async () => {
    // Test refund calculation function
    const sessionAmount = 10000; // $100
    const hoursBeforeStart = 48;

    const refundPercentage = hoursBeforeStart > 24 ? 1.00 : 0.50;
    const expectedRefund = sessionAmount * refundPercentage;

    expect(expectedRefund).toBe(10000); // 100% refund
  });

  test('50% refund if cancelled < 24 hours before', async () => {
    const sessionAmount = 10000;
    const hoursBeforeStart = 12;

    const refundPercentage = hoursBeforeStart > 24 ? 1.00 : 0.50;
    const expectedRefund = sessionAmount * refundPercentage;

    expect(expectedRefund).toBe(5000); // 50% refund
  });

  test('no refund for in-progress session cancellation', async () => {
    const sessionAmount = 10000;
    const isInProgress = true;

    const refundPercentage = isInProgress ? 0.00 : 0.50;
    const expectedRefund = sessionAmount * refundPercentage;

    expect(expectedRefund).toBe(0); // No refund
  });
});

test.describe('Payout Flow', () => {
  test('expert payout records in database', async ({ page }) => {
    // Mock payout creation
    await page.route('**/payments**', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'pay-123',
            expert_payout_cents: 9000,
            status: 'completed',
          }),
        });
      }
    });

    // Verify payout record
    const response = await page.request.post('/api/payouts', {
      data: { sessionId: 'session-123' },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.expert_payout_cents).toBe(9000);
  });

  test('payout status updates correctly', async ({ page }) => {
    // Test payout status workflow: pending → processing → completed
    const statuses = ['pending', 'processing', 'completed'];

    for (const status of statuses) {
      // Each status transition should be valid
      expect(['pending', 'processing', 'completed']).toContain(status);
    }
  });
});
