// Web Dashboard E2E tests - Phase 06: Integration Tests
import { test, expect } from '@playwright/test';

test.describe('User Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/v1/token**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-token',
          user: { id: 'user-123', email: 'user@example.com' },
        }),
      });
    });

    // Mock user profile
    await page.route('**/profiles**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'user-123', full_name: 'Test User', role: 'client' }),
      });
    });

    await page.goto('/login');
    await page.fill('[name=email]', 'user@example.com');
    await page.fill('[name=password]', 'password');
    await page.click('button[type=submit]');
    await page.waitForURL('/dashboard');
  });

  test('displays active sessions', async ({ page }) => {
    // Mock sessions
    await page.route('**/sessions**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 's1', topic: 'React Help', status: 'in_progress', expert: { full_name: 'Expert 1' } },
          { id: 's2', topic: 'Cursor Setup', status: 'confirmed', expert: { full_name: 'Expert 2' } },
        ]),
      });
    });

    await page.goto('/dashboard/user');

    // Verify session cards render
    await expect(page.locator('text=React Help')).toBeVisible();
    await expect(page.locator('text=Cursor Setup')).toBeVisible();

    // Check session status badges
    await expect(page.locator('text=In Progress')).toBeVisible();
    await expect(page.locator('text=Confirmed')).toBeVisible();
  });

  test('shows available experts', async ({ page }) => {
    await page.goto('/dashboard/user');
    await page.click('text=Find an Expert');

    // Verify expert cards display
    await expect(page.locator('text=Expert')).toBeVisible();

    // Check filtering works
    await page.fill('[placeholder=Search experts...]', 'React');
    await expect(page.locator('text=React Expert')).toBeVisible();
  });

  test('can start video session', async ({ page }) => {
    // Mock session with video room
    await page.route('**/sessions/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'session-123',
          daily_room_url: 'https://callanexpert.daily.co/test-room',
          status: 'in_progress',
          topic: 'Test Session',
        }),
      });
    });

    await page.goto('/dashboard/user/session/session-123');

    // Verify video room loads
    await expect(page.locator('[data-testid=video-room]')).toBeVisible();

    // Test screen share toggle (mock)
    await page.click('button[aria-label=Screen Share]');
  });
});

test.describe('Expert Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock expert authentication
    await page.route('**/auth/v1/token**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'expert-token',
          user: { id: 'expert-123', email: 'expert@example.com' },
        }),
      });
    });

    await page.goto('/login');
    await page.fill('[name=email]', 'expert@example.com');
    await page.fill('[name=password]', 'password');
    await page.click('button[type=submit]');
    await page.waitForURL('/dashboard/expert');
  });

  test('displays earnings stats', async ({ page }) => {
    await page.goto('/dashboard/expert');

    // Verify stat cards render
    await expect(page.locator('text=Total Earnings')).toBeVisible();
    await expect(page.locator('text=This Month')).toBeVisible();

    // Check currency formatting
    await expect(page.locator('$')).toBeVisible();
  });

  test('availability toggle works', async ({ page }) => {
    // Mock availability update
    await page.route('**/expert_profiles**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'expert-123', is_available: true }),
      });
    });

    // Change status to online
    await page.click('text=Go Online');

    // Verify UI updates
    await expect(page.locator('text=Online')).toBeVisible();
  });

  test('incoming requests display', async ({ page }) => {
    // Mock incoming request notification
    await page.route('**/sessions**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'req-123',
          topic: 'Help with React',
          client: { full_name: 'Client User' },
          status: 'requested',
        }]),
      });
    });

    // Verify notification appears
    await expect(page.locator('text=New Request')).toBeVisible();
  });
});

test.describe('Payment Flow', () => {
  test('payment modal opens correctly', async ({ page }) => {
    await page.goto('/dashboard/user');

    // Go to checkout
    await page.click('text=Book Session');

    // Verify payment amount
    await expect(page.locator('$150.00')).toBeVisible();

    // Check form fields
    await expect(page.locator('[name=cardNumber]')).toBeVisible();
  });

  test('Stripe checkout redirects', async ({ page }) => {
    // Mock Stripe
    await page.route('**/stripe.com/**', route => {
      route.fulfill({ status: 200, body: 'Stripe Checkout' });
    });

    await page.click('text=Pay Now');

    // Verify redirect (in real test, would check Stripe URL)
    await expect(page).toHaveURL(/stripe/);
  });

  test('payment success shows confirmation', async ({ page }) => {
    // Mock successful payment
    await page.route('**/payments**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'pay-123', status: 'completed' }),
      });
    });

    await page.click('text=Confirm Payment');

    // Verify success message
    await expect(page.locator('text=Payment Successful')).toBeVisible();

    // Check session status updated
    await expect(page.locator('text=Session Confirmed')).toBeVisible();
  });
});
