// Test utilities and helpers - Phase 06: Integration Tests

import { test as base } from '@playwright/test';

export { expect } from '@playwright/test';

/**
 * Create a test with authentication context
 */
export function authenticatedTest(testFn: Parameters<typeof base>[1]) {
  return base('authenticated', testFn);
}

/**
 * Mock Supabase responses
 */
export function mockSupabaseResponses(page: any) {
  // Mock auth response
  page.route('**/auth/v1/token**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'test-token',
        user: { id: 'test-user-id', email: 'test@example.com' },
      }),
    });
  });

  // Mock profile response
  page.route('**/rest/v1/profiles**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: 'test-user-id',
        full_name: 'Test User',
        role: 'client',
        email: 'test@example.com',
      }]),
    });
  });
}

/**
 * Mock Stripe responses
 */
export function mockStripeResponses(page: any) {
  page.route('**/api.stripe.com/**', route => {
    route.fulfill({
      status: 200,
      body: 'Stripe mock response',
    });
  });
}

/**
 * Mock Daily.co responses
 */
export function mockDailyResponses(page: any) {
  page.route('**/api.daily.co/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'room-test',
        name: 'test-room',
        url: 'https://callanexpert.daily.co/test-room',
        privacy: 'private',
      }),
    });
  });
}

/**
 * Create mock session data
 */
export function createMockSession(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'session-test-id',
    topic: 'Test Session',
    status: 'requested',
    duration_minutes: 60,
    session_rate_cents: 15000,
    total_amount_cents: 15000,
    commission_amount_cents: 1500,
    expert_payout_cents: 13500,
    client_id: 'client-test-id',
    expert_id: 'expert-test-id',
    daily_room_url: 'https://callanexpert.daily.co/test-room',
    scheduled_start: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock expert data
 */
export function createMockExpert(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'expert-test-id',
    user_id: 'expert-user-id',
    bio: 'Test expert bio',
    hourly_rate_cents: 15000,
    years_experience: 5,
    is_available: true,
    rating: 4.8,
    total_sessions: 42,
    profiles: {
      full_name: 'Test Expert',
      avatar_url: 'https://example.com/avatar.jpg',
    },
    ...overrides,
  };
}

/**
 * Wait for element to be visible with timeout
 */
export async function waitForVisible(page: any, selector: string, timeout = 10000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Fill and submit form
 */
export async function fillForm(page: any, formData: Record<string, string>) {
  for (const [field, value] of Object.entries(formData)) {
    await page.fill(`[name=${field}]`, value);
  }
  await page.click('button[type=submit]');
}
